package com.codemind.analyzer;

import com.codemind.domain.model.SymbolEntity;
import com.codemind.domain.model.SymbolKind;
import com.codemind.domain.model.SymbolVisibility;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.Modifier;
import com.github.javaparser.ast.nodeTypes.NodeWithModifiers;
import com.github.javaparser.ast.body.*;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class JavaSymbolExtractor {

    public List<SymbolEntity> extractSymbols(
            CompilationUnit cu,
            UUID repositoryId,
            UUID analysisId,
            String filePath
    ) {
        List<SymbolEntity> symbols = new ArrayList<>();
        if (cu == null) {
            return symbols;
        }

        String packageName = cu.getPackageDeclaration()
                .map(pd -> pd.getName().asString())
                .orElse("");

        UUID packageSymbolId = null;
        if (!packageName.isEmpty()) {
            SymbolEntity pkgSymbol = new SymbolEntity(
                    UUID.randomUUID(),
                    repositoryId,
                    analysisId,
                    filePath,
                    packageName,
                    packageName,
                    SymbolKind.PACKAGE,
                    null,
                    cu.getPackageDeclaration().flatMap(pd -> pd.getRange().map(r -> r.begin.line)).orElse(1),
                    cu.getPackageDeclaration().flatMap(pd -> pd.getRange().map(r -> r.end.line)).orElse(1),
                    SymbolVisibility.PUBLIC,
                    false,
                    false,
                    false,
                    packageName,
                    null,
                    0
            );
            symbols.add(pkgSymbol);
            packageSymbolId = pkgSymbol.getId();
        }

        // Extract primary and nested types
        for (TypeDeclaration<?> typeDecl : cu.getTypes()) {
            extractType(typeDecl, packageName, packageSymbolId, repositoryId, analysisId, filePath, symbols);
        }

        return symbols;
    }

    private void extractType(
            TypeDeclaration<?> typeDecl,
            String parentFqn,
            UUID parentSymbolId,
            UUID repositoryId,
            UUID analysisId,
            String filePath,
            List<SymbolEntity> symbols
    ) {
        String simpleName = typeDecl.getNameAsString();
        String fqn = parentFqn.isEmpty() ? simpleName : parentFqn + "." + simpleName;

        SymbolKind kind;
        if (typeDecl instanceof ClassOrInterfaceDeclaration) {
            ClassOrInterfaceDeclaration cid = (ClassOrInterfaceDeclaration) typeDecl;
            kind = cid.isInterface() ? SymbolKind.INTERFACE : SymbolKind.CLASS;
        } else if (typeDecl instanceof EnumDeclaration) {
            kind = SymbolKind.ENUM;
        } else if (typeDecl instanceof RecordDeclaration) {
            kind = SymbolKind.RECORD;
        } else {
            kind = SymbolKind.CLASS;
        }

        SymbolVisibility visibility = determineVisibility(typeDecl);
        boolean isStatic = hasModifier(typeDecl, Modifier.Keyword.STATIC);
        boolean isFinal = hasModifier(typeDecl, Modifier.Keyword.FINAL);
        boolean isAbstract = hasModifier(typeDecl, Modifier.Keyword.ABSTRACT);

        int startLine = typeDecl.getRange().map(r -> r.begin.line).orElse(1);
        int endLine = typeDecl.getRange().map(r -> r.end.line).orElse(startLine);

        SymbolEntity typeSymbol = new SymbolEntity(
                UUID.randomUUID(),
                repositoryId,
                analysisId,
                filePath,
                fqn,
                simpleName,
                kind,
                parentSymbolId,
                startLine,
                endLine,
                visibility,
                isStatic,
                isFinal,
                isAbstract,
                simpleName,
                null,
                0
        );
        symbols.add(typeSymbol);
        UUID typeId = typeSymbol.getId();

        // Extract members
        for (BodyDeclaration<?> member : typeDecl.getMembers()) {
            if (member instanceof FieldDeclaration) {
                FieldDeclaration fieldDecl = (FieldDeclaration) member;
                SymbolVisibility fieldVis = determineVisibility(fieldDecl);
                boolean fStatic = hasModifier(fieldDecl, Modifier.Keyword.STATIC);
                boolean fFinal = hasModifier(fieldDecl, Modifier.Keyword.FINAL);
                String returnType = fieldDecl.getElementType().asString();
                int fStart = fieldDecl.getRange().map(r -> r.begin.line).orElse(startLine);
                int fEnd = fieldDecl.getRange().map(r -> r.end.line).orElse(fStart);

                for (VariableDeclarator var : fieldDecl.getVariables()) {
                    String varName = var.getNameAsString();
                    String varFqn = fqn + "." + varName;
                    symbols.add(new SymbolEntity(
                            UUID.randomUUID(),
                            repositoryId,
                            analysisId,
                            filePath,
                            varFqn,
                            varName,
                            SymbolKind.FIELD,
                            typeId,
                            fStart,
                            fEnd,
                            fieldVis,
                            fStatic,
                            fFinal,
                            false,
                            varName,
                            returnType,
                            0
                    ));
                }
            } else if (member instanceof ConstructorDeclaration) {
                ConstructorDeclaration ctor = (ConstructorDeclaration) member;
                String ctorName = ctor.getNameAsString();
                String signature = getCallableSignature(ctor);
                String ctorFqn = fqn + "." + signature;
                int cStart = ctor.getRange().map(r -> r.begin.line).orElse(startLine);
                int cEnd = ctor.getRange().map(r -> r.end.line).orElse(cStart);

                symbols.add(new SymbolEntity(
                        UUID.randomUUID(),
                        repositoryId,
                        analysisId,
                        filePath,
                        ctorFqn,
                        ctorName,
                        SymbolKind.CONSTRUCTOR,
                        typeId,
                        cStart,
                        cEnd,
                        determineVisibility(ctor),
                        false,
                        false,
                        false,
                        signature,
                        simpleName,
                        ctor.getParameters().size()
                ));
            } else if (member instanceof MethodDeclaration) {
                MethodDeclaration method = (MethodDeclaration) member;
                String methodName = method.getNameAsString();
                String signature = getCallableSignature(method);
                String methodFqn = fqn + "." + signature;
                int mStart = method.getRange().map(r -> r.begin.line).orElse(startLine);
                int mEnd = method.getRange().map(r -> r.end.line).orElse(mStart);

                symbols.add(new SymbolEntity(
                        UUID.randomUUID(),
                        repositoryId,
                        analysisId,
                        filePath,
                        methodFqn,
                        methodName,
                        SymbolKind.METHOD,
                        typeId,
                        mStart,
                        mEnd,
                        determineVisibility(method),
                        hasModifier(method, Modifier.Keyword.STATIC),
                        hasModifier(method, Modifier.Keyword.FINAL),
                        hasModifier(method, Modifier.Keyword.ABSTRACT),
                        signature,
                        method.getTypeAsString(),
                        method.getParameters().size()
                ));
            } else if (member instanceof TypeDeclaration<?>) {
                // Nested type
                extractType((TypeDeclaration<?>) member, fqn, typeId, repositoryId, analysisId, filePath, symbols);
            }
        }
    }

    private SymbolVisibility determineVisibility(NodeWithModifiers<?> node) {
        if (node.hasModifier(Modifier.Keyword.PUBLIC)) {
            return SymbolVisibility.PUBLIC;
        } else if (node.hasModifier(Modifier.Keyword.PROTECTED)) {
            return SymbolVisibility.PROTECTED;
        } else if (node.hasModifier(Modifier.Keyword.PRIVATE)) {
            return SymbolVisibility.PRIVATE;
        } else {
            return SymbolVisibility.PACKAGE_PRIVATE;
        }
    }

    private boolean hasModifier(NodeWithModifiers<?> node, Modifier.Keyword keyword) {
        return node.hasModifier(keyword);
    }

    public static String getCallableSignature(CallableDeclaration<?> callable) {
        StringBuilder sb = new StringBuilder();
        sb.append(callable.getNameAsString()).append("(");
        for (int i = 0; i < callable.getParameters().size(); i++) {
            if (i > 0) sb.append(", ");
            sb.append(callable.getParameter(i).getTypeAsString());
        }
        sb.append(")");
        return sb.toString();
    }
}
