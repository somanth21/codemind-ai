package com.codemind.analyzer;

import com.github.javaparser.JavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.body.MethodDeclaration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MetricsCalculatorTest {

    private MetricsCalculator calculator;
    private JavaParser parser;

    @BeforeEach
    void setUp() {
        calculator = new MetricsCalculator();
        parser = new JavaParser();
    }

    @Test
    void calculatePhysicalLoc_countsAllLines() {
        String code = "line 1\nline 2\r\nline 3\n";
        assertThat(calculator.calculatePhysicalLoc(code)).isEqualTo(4);
        assertThat(calculator.calculatePhysicalLoc("")).isEqualTo(0);
        assertThat(calculator.calculatePhysicalLoc(null)).isEqualTo(0);
    }

    @Test
    void calculateLogicalLoc_ignoresCommentsAndBlankLines() {
        String code = """
                // Single line comment
                package com.example;
                
                /*
                 * Multi-line comment
                 */
                public class Demo {
                    // Another comment
                    int x = 1;
                }
                """;
        int lloc = calculator.calculateLogicalLoc(code);
        // lines: package com.example; public class Demo { int x = 1; } -> 4 logical lines
        assertThat(lloc).isEqualTo(4);
    }

    @Test
    void calculateCyclomaticComplexity_and_nestingDepth() {
        String code = """
                class Test {
                    void complexMethod(int a, int b) {
                        if (a > 0 && b > 0) {
                            for (int i = 0; i < 10; i++) {
                                while (a < 5) {
                                    a++;
                                }
                            }
                        } else if (a < 0) {
                            switch (b) {
                                case 1:
                                case 2:
                                    break;
                                default:
                                    break;
                            }
                        }
                    }
                }
                """;
        CompilationUnit cu = parser.parse(code).getResult().orElseThrow();
        MethodDeclaration method = cu.findFirst(MethodDeclaration.class).orElseThrow();

        int cc = calculator.calculateCyclomaticComplexity(method);
        // Base = 1
        // if (a > 0 && b > 0) -> +1 for if, +1 for &&
        // for -> +1
        // while -> +1
        // else if (a < 0) -> +1
        // switch case 1, case 2 -> +2
        // Total CC = 1 + 1 + 1 + 1 + 1 + 1 + 2 = 8
        assertThat(cc).isEqualTo(8);

        int depth = calculator.calculateNestingDepth(method);
        // if -> for -> while -> depth 3
        assertThat(depth).isGreaterThanOrEqualTo(3);
    }

    @Test
    void calculateHalsteadAndMaintainabilityIndex() {
        String code = """
                class HalsteadTest {
                    int add(int a, int b) {
                        return a + b;
                    }
                }
                """;
        CompilationUnit cu = parser.parse(code).getResult().orElseThrow();
        MethodDeclaration method = cu.findFirst(MethodDeclaration.class).orElseThrow();

        MetricsCalculator.HalsteadResult result = calculator.calculateHalstead(method);
        assertThat(result.getDistinctOperators()).isGreaterThan(0);
        assertThat(result.getDistinctOperands()).isGreaterThan(0);
        assertThat(result.getVolume()).isGreaterThan(0.0);

        double mi = calculator.calculateMaintainabilityIndex(result.getVolume(), 1, 5);
        assertThat(mi).isBetween(0.0, 100.0);
    }
}
