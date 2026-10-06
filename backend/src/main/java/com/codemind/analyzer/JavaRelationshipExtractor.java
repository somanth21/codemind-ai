package com.codemind.analyzer;

import com.codemind.domain.model.RelationshipConfidence;
import com.codemind.domain.model.RelationshipEntity;
import com.codemind.domain.model.RelationshipType;
import com.codemind.domain.model.SymbolEntity;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.ImportDeclaration;
import com.github.javaparser.ast.body.*;
import com.github.javaparser.ast.expr.FieldAccessExpr;
import com.github.javaparser.ast.expr.MethodCallExpr;
import com.github.javaparser.ast.expr.ObjectCreationExpr;
import com.github.javaparser.ast.type.ClassOrInterfaceType;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class JavaRelationshipExtractor {

    public List<RelationshipEntity> extractRelationships(
            CompilationUnit cu,
            UUID repositoryId,
            UUID analysisId,
            List<SymbolEntity> fileSymbols
    ) {
        List<RelationshipEntity> relationships = new ArrayList<>();
        if (cu == null) {
            return relationships;
        }

        String packageName = cu.getPackageDeclaration()
                .map(pd -> pd.getName().asString())
                .orElse("");

        // Map simple class names from imports to their FQN
        Map<String, String> importMap = new HashMap<>();
        for (ImportDeclaration imp : cu.getImports()) {
            if (!imp.isAsterisk()) {
                String fullImport = imp.getNameAsString();
                String simpleName = fullImport.substring(fullImport.lastIndexOf('.') + 1);
                importMap.put(simpleName, fullImport);
            }
        }

        // Map FQNs and simple names to SymbolEntities in this file
        Map<String, SymbolEntity> fqnToSymbol = new HashMap<>();
        for (SymbolEntity s : fileSymbols) {
            if (s.getFqn() != null) {
                fqnToSymbol.put(s.getFqn(), s);
            }
        }

        for (TypeDeclaration<?> typeDecl : cu.getTypes()) {
            extractTypeRelationships(typeDecl, packageName, repositoryId, analysisId, importMap, fqnToSymbol, relationships);
        }

        return relationships;
    }

    private void extractTypeRelationships(
            TypeDeclaration<?> typeDecl,
            String parentFqn,
            UUID repositoryId,
            UUID analysisId,
            Map<String, String> importMap,
            Map<String, SymbolEntity> fqnToSymbol,
            List<RelationshipEntity> relationships
    ) {
        String simpleName = typeDecl.getNameAsString();
        String typeFqn = parentFqn.isEmpty() ? simpleName : parentFqn + "." + simpleName;
        SymbolEntity typeSymbol = fqnToSymbol.get(typeFqn);
        UUID typeId = typeSymbol != null ? typeSymbol.getId() : null;

        // 1. EXTENDS and IMPLEMENTS
        if (typeDecl instanceof ClassOrInterfaceDeclaration) {
            ClassOrInterfaceDeclaration cid = (ClassOrInterfaceDeclaration) typeDecl;
            for (ClassOrInterfaceType ext : cid.getExtendedTypes()) {
                String extName = ext.getNameAsString();
                String targetFqn = resolveFqn(extName, parentFqn, importMap);
                int line = ext.getRange().map(r -> r.begin.line).orElse(1);

                relationships.add(new RelationshipEntity(
                        UUID.randomUUID(),
                        repositoryId,
                        analysisId,
                        typeId,
                        null,
                        typeFqn,
                        targetFqn,
                        RelationshipType.EXTENDS,
                        isResolved(targetFqn) ? RelationshipConfidence.RESOLVED : RelationshipConfidence.PARTIAL,
                        line
                ));
            }

            for (ClassOrInterfaceType impl : cid.getImplementedTypes()) {
                String implName = impl.getNameAsString();
                String targetFqn = resolveFqn(implName, parentFqn, importMap);
                int line = impl.getRange().map(r -> r.begin.line).orElse(1);

                relationships.add(new RelationshipEntity(
                        UUID.randomUUID(),
                        repositoryId,
                        analysisId,
                        typeId,
                        null,
                        typeFqn,
                        targetFqn,
                        RelationshipType.IMPLEMENTS,
                        isResolved(targetFqn) ? RelationshipConfidence.RESOLVED : RelationshipConfidence.PARTIAL,
                        line
                ));
            }
        } else if (typeDecl instanceof RecordDeclaration) {
            RecordDeclaration rd = (RecordDeclaration) typeDecl;
            for (ClassOrInterfaceType impl : rd.getImplementedTypes()) {
                String implName = impl.getNameAsString();
                String targetFqn = resolveFqn(implName, parentFqn, importMap);
                int line = impl.getRange().map(r -> r.begin.line).orElse(1);

                relationships.add(new RelationshipEntity(
                        UUID.randomUUID(),
                        repositoryId,
                        analysisId,
                        typeId,
                        null,
                        typeFqn,
                        targetFqn,
                        RelationshipType.IMPLEMENTS,
                        isResolved(targetFqn) ? RelationshipConfidence.RESOLVED : RelationshipConfidence.PARTIAL,
                        line
                ));
            }
        } else if (typeDecl instanceof EnumDeclaration) {
            EnumDeclaration ed = (EnumDeclaration) typeDecl;
            for (ClassOrInterfaceType impl : ed.getImplementedTypes()) {
                String implName = impl.getNameAsString();
                String targetFqn = resolveFqn(implName, parentFqn, importMap);
                int line = impl.getRange().map(r -> r.begin.line).orElse(1);

                relationships.add(new RelationshipEntity(
                        UUID.randomUUID(),
                        repositoryId,
                        analysisId,
                        typeId,
                        null,
                        typeFqn,
                        targetFqn,
                        RelationshipType.IMPLEMENTS,
                        isResolved(targetFqn) ? RelationshipConfidence.RESOLVED : RelationshipConfidence.PARTIAL,
                        line
                ));
            }
        }

        // 2. CALLS, CREATES, FIELD_ACCESS inside methods/constructors
        for (BodyDeclaration<?> member : typeDecl.getMembers()) {
            if (member instanceof MethodDeclaration) {
                MethodDeclaration md = (MethodDeclaration) member;
                String methodSignature = JavaSymbolExtractor.getCallableSignature(md);
                String sourceFqn = typeFqn + "." + methodSignature;
                SymbolEntity sourceSymbol = fqnToSymbol.get(sourceFqn);
                UUID sourceId = sourceSymbol != null ? sourceSymbol.getId() : typeId;

                extractBodyRelationships(md, sourceId, sourceFqn, typeFqn, repositoryId, analysisId, importMap, relationships);
            } else if (member instanceof ConstructorDeclaration) {
                ConstructorDeclaration cd = (ConstructorDeclaration) member;
                String ctorSignature = JavaSymbolExtractor.getCallableSignature(cd);
                String sourceFqn = typeFqn + "." + ctorSignature;
                SymbolEntity sourceSymbol = fqnToSymbol.get(sourceFqn);
                UUID sourceId = sourceSymbol != null ? sourceSymbol.getId() : typeId;

                extractBodyRelationships(cd, sourceId, sourceFqn, typeFqn, repositoryId, analysisId, importMap, relationships);
            } else if (member instanceof TypeDeclaration<?>) {
                extractTypeRelationships((TypeDeclaration<?>) member, typeFqn, repositoryId, analysisId, importMap, fqnToSymbol, relationships);
            }
        }
    }

    private void extractBodyRelationships(
            CallableDeclaration<?> callable,
            UUID sourceId,
            String sourceFqn,
            String classFqn,
            UUID repositoryId,
            UUID analysisId,
            Map<String, String> importMap,
            List<RelationshipEntity> relationships
    ) {
        // CALLS: MethodCallExpr
        for (MethodCallExpr mce : callable.findAll(MethodCallExpr.class)) {
            String callName = mce.getNameAsString();
            String scope = mce.getScope().map(Object::toString).orElse("");
            int line = mce.getRange().map(r -> r.begin.line).orElse(1);

            String targetFqn;
            RelationshipConfidence confidence;
            if (scope.isEmpty() || "this".equals(scope)) {
                targetFqn = classFqn + "." + callName;
                confidence = RelationshipConfidence.RESOLVED;
            } else if (importMap.containsKey(scope)) {
                targetFqn = importMap.get(scope) + "." + callName;
                confidence = RelationshipConfidence.RESOLVED;
            } else {
                targetFqn = scope + "." + callName;
                confidence = RelationshipConfidence.PARTIAL;
            }

            relationships.add(new RelationshipEntity(
                    UUID.randomUUID(),
                    repositoryId,
                    analysisId,
                    sourceId,
                    null,
                    sourceFqn,
                    targetFqn,
                    RelationshipType.CALLS,
                    confidence,
                    line
            ));
        }

        // CREATES: ObjectCreationExpr
        for (ObjectCreationExpr oce : callable.findAll(ObjectCreationExpr.class)) {
            String typeName = oce.getType().getNameAsString();
            int line = oce.getRange().map(r -> r.begin.line).orElse(1);
            String targetFqn = resolveFqn(typeName, classFqn.contains(".") ? classFqn.substring(0, classFqn.lastIndexOf('.')) : "", importMap);
            RelationshipConfidence confidence = isResolved(targetFqn) ? RelationshipConfidence.RESOLVED : RelationshipConfidence.PARTIAL;

            relationships.add(new RelationshipEntity(
                    UUID.randomUUID(),
                    repositoryId,
                    analysisId,
                    sourceId,
                    null,
                    sourceFqn,
                    targetFqn,
                    RelationshipType.CREATES,
                    confidence,
                    line
            ));
        }

        // FIELD_ACCESS: FieldAccessExpr
        for (FieldAccessExpr fae : callable.findAll(FieldAccessExpr.class)) {
            String fieldName = fae.getNameAsString();
            String scope = fae.getScope().toString();
            int line = fae.getRange().map(r -> r.begin.line).orElse(1);

            String targetFqn;
            RelationshipConfidence confidence;
            if ("this".equals(scope)) {
                targetFqn = classFqn + "." + fieldName;
                confidence = RelationshipConfidence.RESOLVED;
            } else if (importMap.containsKey(scope)) {
                targetFqn = importMap.get(scope) + "." + fieldName;
                confidence = RelationshipConfidence.RESOLVED;
            } else {
                targetFqn = scope + "." + fieldName;
                confidence = RelationshipConfidence.PARTIAL;
            }

            relationships.add(new RelationshipEntity(
                    UUID.randomUUID(),
                    repositoryId,
                    analysisId,
                    sourceId,
                    null,
                    sourceFqn,
                    targetFqn,
                    RelationshipType.FIELD_ACCESS,
                    confidence,
                    line
            ));
        }
    }

    private String resolveFqn(String simpleName, String currentPackage, Map<String, String> importMap) {
        if (importMap.containsKey(simpleName)) {
            return importMap.get(simpleName);
        }
        if (simpleName.contains(".")) {
            return simpleName;
        }
        if (!currentPackage.isEmpty()) {
            return currentPackage + "." + simpleName;
        }
        return simpleName;
    }

    private boolean isResolved(String fqn) {
        return fqn != null && fqn.contains(".");
    }
}
