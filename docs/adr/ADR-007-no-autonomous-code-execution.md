# ADR-007: Strict Prohibition of Autonomous Code Compilation and Execution

## Status
Accepted

## Context
A major safety hazard in automated software engineering assistants is the accidental or autonomous execution of untrusted repository code. Modern repositories frequently contain build scripts (`pom.xml`, `build.gradle`, `package.json`, `Makefile`, shell scripts), test runners, code-generation plugins, or compiled binaries.

If an assistant compiles or runs repository code (e.g., to run tests or measure dynamic coverage), an untrusted or adversarial repository could trigger Remote Code Execution (RCE), execute hostile shell payloads, exfiltrate host environment credentials, or compromise system infrastructure.

## Decision
We established the **Strict Non-Execution Invariant**: **CodeMind AI is an analytical and advisory software understanding assistant, NEVER a build server or runtime execution environment. It NEVER executes repository code, NEVER invokes compiler or build scripts, and NEVER executes system shell commands found in or associated with uploaded repositories.**

Under this architectural decision:
1. **Zero Dynamic Compilation**: The backend never executes `javac`, `make`, `mvn`, `gradle`, `npm`, or `pip` on repository contents.
2. **Pure Static Inspection**: All understanding is derived from static Abstract Syntax Trees (`JavaParser`), token scanners, and deterministic regular expression matching.
3. **Zero Shell Execution**: The application process possesses no capabilities or endpoints to invoke host operating system shells (`/bin/sh`, `cmd.exe`, `powershell.exe`) on repository code.
4. **Binary Isolation**: `BinaryDetector` flags and isolates binary executables (`.exe`, `.dll`, `.so`, `.class`), excluding them from analytical text processing.
5. **No Autonomous Modification**: The system does not write changes to repository branches or autonomously submit pull requests.

## Alternatives Considered
1. **Sandboxed Container Execution (Docker / Firecracker MicroVMs)**:
   - Compiling and running repository code inside disposable, isolated microVMs to gather dynamic coverage and test results.
   - *Rejected*: Dramatically increased operational complexity, hardware requirements, startup latency, and vulnerability to container breakout / CPU resource exhaustion attacks.
2. **Interactive Build Execution with User Confirmation**:
   - Prompting the user before executing build scripts.
   - *Rejected*: Users frequently click through approval prompts without inspecting complex transitive build plugins, exposing the host to supply-chain attacks.

## Consequences
### Positive:
- **Maximum Host Safety**: Completely eliminates the entire attack class of malicious build-time execution and RCE via untrusted repositories.
- **Lightweight Infrastructure**: The application runs efficiently on standard developer workstations without requiring virtualization, root privileges, or container runtimes.
- **Predictable Performance**: Static analysis exhibits deterministic, bounded CPU and memory consumption.

### Negative / Trade-offs:
- The system cannot observe dynamic runtime execution paths, runtime reflection outputs, or unit test pass/fail results.
- Static call graph resolution cannot resolve dynamic dependency injection bindings.

## Security Implications
- Forms the foundational defense against malicious repository payloads, supply-chain attacks, and host compromise.
