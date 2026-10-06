package com.codemind.analyzer;

import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.Node;
import com.github.javaparser.ast.body.*;
import com.github.javaparser.ast.expr.*;
import com.github.javaparser.ast.stmt.*;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class MetricsCalculator implements MetricsService {

    public static class HalsteadResult {
        private final int distinctOperators;
        private final int totalOperators;
        private final int distinctOperands;
        private final int totalOperands;
        private final double vocabulary;
        private final double length;
        private final double volume;
        private final double difficulty;
        private final double effort;

        public HalsteadResult(int distinctOperators, int totalOperators, int distinctOperands, int totalOperands) {
            this.distinctOperators = distinctOperators;
            this.totalOperators = totalOperators;
            this.distinctOperands = distinctOperands;
            this.totalOperands = totalOperands;
            this.vocabulary = distinctOperators + distinctOperands;
            this.length = totalOperators + totalOperands;
            if (this.vocabulary > 0) {
                this.volume = this.length * (Math.log(this.vocabulary) / Math.log(2.0));
            } else {
                this.volume = 0.0;
            }
            if (this.distinctOperands > 0) {
                this.difficulty = (this.distinctOperators / 2.0) * ((double) this.totalOperands / this.distinctOperands);
            } else {
                this.difficulty = 0.0;
            }
            this.effort = this.difficulty * this.volume;
        }

        public double getVolume() {
            return Math.round(volume * 100.0) / 100.0;
        }

        public double getDifficulty() {
            return Math.round(difficulty * 100.0) / 100.0;
        }

        public double getEffort() {
            return Math.round(effort * 100.0) / 100.0;
        }

        public int getDistinctOperators() {
            return distinctOperators;
        }

        public int getTotalOperators() {
            return totalOperators;
        }

        public int getDistinctOperands() {
            return distinctOperands;
        }

        public int getTotalOperands() {
            return totalOperands;
        }
    }

    @Override
    public int countLinesOfCode(String content) {
        return calculatePhysicalLoc(content);
    }

    public int calculatePhysicalLoc(String content) {
        if (content == null || content.isEmpty()) {
            return 0;
        }
        String[] lines = content.split("\r\n|\r|\n", -1);
        return lines.length;
    }

    public int calculateLogicalLoc(String content) {
        if (content == null || content.isEmpty()) {
            return 0;
        }
        String[] lines = content.split("\r\n|\r|\n", -1);
        int lloc = 0;
        boolean inBlockComment = false;

        for (String rawLine : lines) {
            String line = rawLine.trim();
            if (line.isEmpty()) {
                continue;
            }

            if (inBlockComment) {
                int endIdx = line.indexOf("*/");
                if (endIdx != -1) {
                    inBlockComment = false;
                    String remaining = line.substring(endIdx + 2).trim();
                    if (!remaining.isEmpty() && !remaining.startsWith("//")) {
                        lloc++;
                    }
                }
                continue;
            }

            if (line.startsWith("/*")) {
                int endIdx = line.indexOf("*/", 2);
                if (endIdx == -1) {
                    inBlockComment = true;
                } else {
                    String remaining = line.substring(endIdx + 2).trim();
                    if (!remaining.isEmpty() && !remaining.startsWith("//")) {
                        lloc++;
                    }
                }
                continue;
            }

            if (line.startsWith("//")) {
                continue;
            }

            lloc++;
        }

        return lloc;
    }

    public int calculateCyclomaticComplexity(Node node) {
        if (node == null) {
            return 1;
        }

        int complexity = 1;
        List<Node> descendants = node.findAll(Node.class);

        for (Node d : descendants) {
            if (d == node) {
                continue;
            }
            if (d instanceof IfStmt) {
                complexity++;
            } else if (d instanceof ForStmt || d instanceof ForEachStmt) {
                complexity++;
            } else if (d instanceof WhileStmt || d instanceof DoStmt) {
                complexity++;
            } else if (d instanceof SwitchEntry) {
                SwitchEntry entry = (SwitchEntry) d;
                if (!entry.getLabels().isEmpty()) {
                    complexity += entry.getLabels().size();
                }
            } else if (d instanceof CatchClause) {
                complexity++;
            } else if (d instanceof ConditionalExpr) {
                complexity++;
            } else if (d instanceof BinaryExpr) {
                BinaryExpr be = (BinaryExpr) d;
                if (be.getOperator() == BinaryExpr.Operator.AND || be.getOperator() == BinaryExpr.Operator.OR) {
                    complexity++;
                }
            }
        }

        return complexity;
    }

    public int calculateNestingDepth(Node node) {
        if (node == null) {
            return 0;
        }

        Optional<BlockStmt> bodyOpt = Optional.empty();
        if (node instanceof MethodDeclaration) {
            bodyOpt = ((MethodDeclaration) node).getBody();
        } else if (node instanceof ConstructorDeclaration) {
            bodyOpt = Optional.of(((ConstructorDeclaration) node).getBody());
        }

        if (bodyOpt.isEmpty()) {
            return 0;
        }

        return computeMaxDepth(bodyOpt.get(), 0);
    }

    private int computeMaxDepth(Node current, int currentDepth) {
        int max = currentDepth;

        for (Node child : current.getChildNodes()) {
            int nextDepth = currentDepth;
            if (isControlStructure(child)) {
                nextDepth = currentDepth + 1;
                if (nextDepth > max) {
                    max = nextDepth;
                }
            }
            int childMax = computeMaxDepth(child, nextDepth);
            if (childMax > max) {
                max = childMax;
            }
        }

        return max;
    }

    private boolean isControlStructure(Node node) {
        return node instanceof IfStmt
                || node instanceof ForStmt
                || node instanceof ForEachStmt
                || node instanceof WhileStmt
                || node instanceof DoStmt
                || node instanceof SwitchStmt
                || node instanceof TryStmt
                || node instanceof CatchClause
                || node instanceof SynchronizedStmt;
    }

    public HalsteadResult calculateHalstead(Node node) {
        if (node == null) {
            return new HalsteadResult(0, 0, 0, 0);
        }

        Set<String> distinctOperators = new HashSet<>();
        int totalOperators = 0;

        Set<String> distinctOperands = new HashSet<>();
        int totalOperands = 0;

        List<Node> descendants = node.findAll(Node.class);
        for (Node d : descendants) {
            // Operators
            if (d instanceof AssignExpr) {
                distinctOperators.add(((AssignExpr) d).getOperator().asString());
                totalOperators++;
            } else if (d instanceof BinaryExpr) {
                distinctOperators.add(((BinaryExpr) d).getOperator().asString());
                totalOperators++;
            } else if (d instanceof UnaryExpr) {
                distinctOperators.add(((UnaryExpr) d).getOperator().asString());
                totalOperators++;
            } else if (d instanceof ConditionalExpr) {
                distinctOperators.add("?:");
                totalOperators++;
            } else if (d instanceof MethodCallExpr) {
                distinctOperators.add("()");
                totalOperators++;
            } else if (d instanceof ObjectCreationExpr) {
                distinctOperators.add("new");
                totalOperators++;
            } else if (d instanceof ArrayAccessExpr) {
                distinctOperators.add("[]");
                totalOperators++;
            } else if (d instanceof CastExpr) {
                distinctOperators.add("(cast)");
                totalOperators++;
            } else if (d instanceof IfStmt) {
                distinctOperators.add("if");
                totalOperators++;
            } else if (d instanceof ForStmt || d instanceof ForEachStmt) {
                distinctOperators.add("for");
                totalOperators++;
            } else if (d instanceof WhileStmt) {
                distinctOperators.add("while");
                totalOperators++;
            } else if (d instanceof DoStmt) {
                distinctOperators.add("do");
                totalOperators++;
            } else if (d instanceof SwitchStmt) {
                distinctOperators.add("switch");
                totalOperators++;
            } else if (d instanceof ReturnStmt) {
                distinctOperators.add("return");
                totalOperators++;
            } else if (d instanceof ThrowStmt) {
                distinctOperators.add("throw");
                totalOperators++;
            } else if (d instanceof TryStmt) {
                distinctOperators.add("try");
                totalOperators++;
            } else if (d instanceof CatchClause) {
                distinctOperators.add("catch");
                totalOperators++;
            }

            // Operands
            if (d instanceof SimpleName && !(d.getParentNode().map(p -> p instanceof MethodDeclaration || p instanceof ClassOrInterfaceDeclaration).orElse(false))) {
                String id = ((SimpleName) d).asString();
                distinctOperands.add(id);
                totalOperands++;
            } else if (d instanceof LiteralExpr) {
                String val = d.toString();
                distinctOperands.add(val);
                totalOperands++;
            }
        }

        return new HalsteadResult(distinctOperators.size(), totalOperators, distinctOperands.size(), totalOperands);
    }

    public double calculateMaintainabilityIndex(double halsteadVolume, int cyclomaticComplexity, int loc) {
        double v = Math.max(1.0, halsteadVolume);
        int cc = Math.max(1, cyclomaticComplexity);
        int l = Math.max(1, loc);

        // Standard Maintainability Index: 171 - 5.2 * ln(V) - 0.23 * CC - 16.2 * ln(LOC)
        double rawMi = 171.0 - (5.2 * Math.log(v)) - (0.23 * cc) - (16.2 * Math.log(l));

        // Normalize to 0-100 range
        double normalizedMi = (rawMi * 100.0) / 171.0;
        normalizedMi = Math.max(0.0, Math.min(100.0, normalizedMi));

        return Math.round(normalizedMi * 100.0) / 100.0;
    }
}
