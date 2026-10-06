package com.codemind.fixtures.reuse;

import java.util.*;

/**
 * Reusable utility algorithms and candidates with varying complexity and maintainability.
 */
public class ReuseFixtures {

    // Exact direct reuse candidate
    public static class MathUtils {
        public static int gcd(int a, int b) {
            while (b != 0) {
                int t = b;
                b = a % b;
                a = t;
            }
            return Math.abs(a);
        }

        public static int lcm(int a, int b) {
            if (a == 0 || b == 0) return 0;
            return Math.abs(a * (b / gcd(a, b)));
        }
    }

    // Adaptable string utility
    public static class StringUtils {
        public static boolean isBlank(CharSequence cs) {
            if (cs == null) return true;
            int len = cs.length();
            for (int i = 0; i < len; i++) {
                if (!Character.isWhitespace(cs.charAt(i))) return false;
            }
            return true;
        }

        public static String truncate(String str, int maxWidth) {
            if (str == null) return null;
            if (maxWidth < 0) return "";
            if (str.length() <= maxWidth) return str;
            return str.substring(0, maxWidth);
        }
    }

    // High complexity candidate (McCabe CC > 15)
    public static class ComplexLegacyParser {
        public static int parseComplex(int a, int b, int c, int d, int e) {
            int res = 0;
            if (a > 0) {
                if (b > 0) res += 1; else res -= 1;
                if (c > 0) res += 2; else res -= 2;
            } else {
                if (d > 0) res += 3; else res -= 3;
                if (e > 0) res += 4; else res -= 4;
            }
            switch (a) {
                case 1: res += 10; break;
                case 2: res += 20; break;
                case 3: res += 30; break;
                default: res += 5; break;
            }
            return res;
        }
    }
}
