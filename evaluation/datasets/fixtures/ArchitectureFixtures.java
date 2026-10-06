package com.codemind.fixtures.arch;

/**
 * Architectural coupling and cyclic dependency benchmark fixtures.
 * Defines simulated package dependencies:
 * Cycle 1: pkg_a -> pkg_b -> pkg_c -> pkg_a (3-node cycle)
 * Cycle 2: pkg_d -> pkg_e -> pkg_d (2-node cycle)
 * Layered: web -> service -> repository (acyclic clean hierarchy)
 */
public class ArchitectureFixtures {

    public static class PkgAClass {
        private PkgBClass b;
        public void callB() { if (b != null) b.callC(); }
    }

    public static class PkgBClass {
        private PkgCClass c;
        public void callC() { if (c != null) c.callA(); }
    }

    public static class PkgCClass {
        private PkgAClass a;
        public void callA() { if (a != null) a.callB(); }
    }

    public static class PkgDClass {
        private PkgEClass e;
        public void callE() { if (e != null) e.callD(); }
    }

    public static class PkgEClass {
        private PkgDClass d;
        public void callD() { if (d != null) d.callE(); }
    }

    // Clean layered hierarchy
    public static class WebController {
        private BusinessService service;
    }

    public static class BusinessService {
        private DataRepository repository;
    }

    public static class DataRepository {
        // Pure leaf node
    }
}
