import { BLOCKED_MODULES, POLICY } from './policy.js';

/**
 * Python prologue prepended to every submission.
 *
 * It must be the first thing the interpreter executes, because everything it
 * installs — resource limits, the import firewall, the neutered builtins — only
 * protects code that runs after it.
 *
 * Scope note: this layer is hardening, not an isolation boundary. A determined
 * escape (for example walking object.__subclasses__ to reach a class that was
 * already loaded) is not fully preventable from inside the interpreter. Docker
 * mode provides the actual boundary; this layer is what still holds when the
 * process runs without one, and it closes the routes that casual and
 * semi-targeted attempts actually use.
 */
export const buildGuardPrologue = () => {
    const memoryBytes = POLICY.memoryMb * 1024 * 1024;
    const blocked = BLOCKED_MODULES.map((m) => `'${m}'`).join(', ');

    return `# --- execution sandbox guard (generated) ---
import sys as _sys
import builtins as _b

_sys.dont_write_bytecode = True

# Imported ahead of the firewall so the harness keeps working modules, and so
# traceback binds its own os reference before os becomes unreachable.
import json as _json
import io as _io
import contextlib as _ctx
import traceback as _tb

# Kernel-enforced ceilings. Best effort: some limits are no-ops on macOS, which
# is acceptable because macOS is a development target and Docker mode covers
# production.
try:
    import resource as _res
    def _limit(name, value):
        try:
            key = getattr(_res, name)
            soft, hard = _res.getrlimit(key)
            ceiling = value if hard == _res.RLIM_INFINITY else min(value, hard)
            _res.setrlimit(key, (ceiling, ceiling))
        except Exception:
            pass
    _limit('RLIMIT_AS', ${memoryBytes})       # address space
    _limit('RLIMIT_CPU', ${POLICY.cpuSeconds})  # CPU seconds, then SIGXCPU
    _limit('RLIMIT_FSIZE', 0)                  # zero-byte files: no writes land
    _limit('RLIMIT_NPROC', ${POLICY.maxProcesses})
    _limit('RLIMIT_NOFILE', 256)
    _limit('RLIMIT_CORE', 0)
except Exception:
    pass

_BLOCKED = frozenset([${blocked}])

class _ImportFirewall:
    """Rejects blocked modules at resolution time, before any code loads."""

    def find_spec(self, name, path=None, target=None):
        root = name.split('.')[0]
        if root in _BLOCKED or name in _BLOCKED:
            raise ImportError(
                "import of '%s' is blocked by the execution sandbox" % name
            )
        return None

    # Legacy hook, kept so older resolution paths cannot slip past.
    def find_module(self, name, path=None):
        return self.find_spec(name, path)

_sys.meta_path.insert(0, _ImportFirewall())

# Purge anything already cached, otherwise 'import os' is served from
# sys.modules and never reaches the firewall.
for _name in list(_sys.modules):
    if _name.split('.')[0] in _BLOCKED:
        try:
            del _sys.modules[_name]
        except Exception:
            pass

def _denied(*_args, **_kwargs):
    raise PermissionError('blocked by the execution sandbox')

# open() is the direct route to the filesystem; the rest either block on an
# already-closed stdin or hand back an interactive escape hatch.
_b.open = _denied
_b.input = _denied
_b.breakpoint = _denied
_b.exit = _denied
_b.quit = _denied
_b.help = _denied

# eval/exec/compile stay available: the harness uses eval to parse expected
# values, and with the import firewall in place they cannot reach the host.

try:
    del _res
except NameError:
    pass
# --- end sandbox guard ---
`;
};
