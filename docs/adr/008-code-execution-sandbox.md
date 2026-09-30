# ADR 008: Sandboxed Execution of Submitted Code

## Status
Accepted

## Context
The platform runs user-submitted Python against test cases. Until now that code
was written to a temp file and handed to a bare `spawn('python3', [file])`: it
inherited the backend's filesystem, network namespace, and environment. Any
submission could read `.env`, call MongoDB Atlas or Upstash directly, or make
outbound requests from a trusted Cloud Run IP. A `while True` loop was
"contained" only by a SIGALRM the submission itself could cancel.

For a platform whose entire purpose is executing strangers' code, this was the
single largest open risk in the system.

## Decision
Route all execution through `backend/utils/sandbox/`, which applies three
independent layers. Each is useful alone; the bug that defeats one should not
defeat the next.

**1. Container isolation (`docker`)** — `--network none`, `--read-only`,
`--cap-drop ALL`, `--security-opt no-new-privileges`, non-root `--user`, plus
pids/memory/CPU caps. Network denial here is enforced by the kernel.

**2. In-interpreter guard (`pythonGuard.js`)** — a prologue prepended to every
program. Installs an import firewall at `sys.meta_path[0]`, purges already-cached
blocked modules from `sys.modules`, sets RLIMITs (`RLIMIT_FSIZE = 0` blocks file
writes without affecting pipes), and denies `open`/`input`/`breakpoint`/`exit`.

**3. Parent-enforced limits (`runners.js`)** — wall-clock timeout, output-size
cap with early termination, and process-tree kill. Owned by Node, so submitted
code cannot reach them.

Source is piped to `python3 -I -S -` (isolated mode, no site-packages, no temp
file). Mode is selected by `CODE_SANDBOX_MODE` = `docker` | `subprocess` |
`auto`; `auto` prefers Docker and logs a loud warning if it falls back in
production.

## Alternatives Considered
- **`RestrictedPython` / AST allowlisting.** Rejected: it constrains the
  language users are being graded on, and AST-level sandboxes have a long
  history of bypasses.
- **Firecracker / gVisor microVMs.** Stronger isolation, but needs
  infrastructure Cloud Run does not offer today. Docker's flag set closes the
  realistic attack surface at far lower operational cost.
- **A third-party execution API (Judge0, Piston).** Rejected: per-execution
  cost, added latency, and a new outbound dependency on the hot path.
- **Preloading blocked-but-useful modules before the firewall** (considered to
  rescue `random`). Rejected: a preloaded module remains reachable as an
  attribute of another module, which reopens exactly the hole the firewall
  closes.

## Consequences
- Network access is denied outright under Docker; credentials are unreachable.
- Filesystem writes fail at the kernel level via `RLIMIT_FSIZE`, not by
  convention.
- Infinite loops are terminated by the parent, not by cooperating code.
- Five stdlib modules became unusable because they transitively import `os`:
  `random`, `statistics`, `queue`, `secrets`, `uuid`. They are listed explicitly
  in `BLOCKED_MODULES` so the error names the module the user imported rather
  than surfacing a traceback from inside `random.py`. A survey of 40 stdlib
  modules found no other casualties; `collections.deque` covers `queue`, and
  graded test cases are deterministic so `random` has no legitimate use.
- `RLIMIT_AS` is effectively inert on macOS, so memory capping is real only
  under Docker. Local development is therefore weaker than production by
  design, which is why `auto` warns when it degrades.

### Honest limitations
Subprocess mode is **hardening**, not isolation. It has no kernel-level network
guarantee, and no in-interpreter sandbox can categorically prevent traversal of
`object.__subclasses__()`. It holds in practice because `-I -S` starts a fresh
interpreter in which `subprocess.Popen` never enters that graph. Docker mode is
the only configuration that provides true isolation and is the intended
production setting.

Docker mode is covered by tests that assert argument composition. Live container
execution was **not** exercised in the environment where this was written; that
verification is owed before it is relied upon in production.
