# ADR 008: Sandboxed Execution of Submitted Code

## Status
Accepted

## Implementation update: separate production executor

Production no longer falls back to running programs in the credentialed API
container. Set `CODE_EXECUTOR_URL` (HTTPS) and, when different from its origin,
`CODE_EXECUTOR_AUDIENCE`. The API authenticates with its Google service-account
ID token. With no endpoint configured, execution returns 503; reading, quizzes
and progress remain available. This is an intentional launch gate.

`backend/executor/server.js` is a separately deployable service for a
**dedicated Docker-capable host**, not the current Cloud Run API container:

```sh
# On the dedicated host, with Node 22, Docker, the Python image already pulled,
# production backend dependencies, HTTPS termination and no application secrets:
EXECUTOR_AUDIENCE=https://executor.example.com \
EXECUTOR_CALLERS=your-api-service-account@example.iam.gserviceaccount.com \
CODE_SANDBOX_IMAGE=python@sha256:YOUR_VERIFIED_64_HEX_DIGEST \
PORT=8081 npm --prefix backend run executor
```

Give that host a dedicated least-privilege identity with no database, Redis,
Secret Manager or application storage access. Firewall it behind HTTPS and
restrict ingress to the API where supported; OIDC audience and caller allowlist
checks remain mandatory. No API `.env` is loaded by the executor. Startup rejects
application secret variables and requires a working Docker daemon and a
digest-pinned, pre-pulled image (`--pull=never` prevents request-time pulls). Docker must
never be exposed remotely or shared with unrelated workloads.

Each program executes in its own unprivileged, network-disabled, read-only,
resource-bounded Docker container. Child processes receive a minimal environment,
not the API/executor environment. Local subprocess mode remains explicitly
development-only and does not establish a tenant boundary.

All API execution paths, including authoritative grading, share finite admission:
one active submission, at most eight waiting, a two-second queue wait and a
15-second total submission deadline including queue time. Per-program execution
still has a five-second ceiling. Disconnect/deadline cancellation reaches child
termination; remote transport cancellation closes the executor request. Overload
returns 503 with Retry-After, not a fabricated wrong-answer verdict. Colocated
BullMQ execution is retired and its old setting fails startup.

Local acceptance now includes real Docker network denial, non-root/capability
checks, read-only filesystem, CPU/PID/memory cgroups, OOM and timeout termination,
HTTP saturation, disconnect cancellation and recovery. The existing grading/OPS
tests also pass through Docker, and the full sandbox suite passes using a
digest-pinned image. The standalone service starts without API secrets, binds
loopback, reports readiness and rejects anonymous execution.

These are local acceptance results, not public-host certification. The subsequent
approved host provisioning and its remaining gates are recorded below.

### Provisioned testing host (2026-10-28)

Following explicit user cost approval, `prepalgo-executor` was created in
`prepalgo/us-central1-a`: `e2-micro`, Ubuntu 24.04, 20 GB `pd-standard`,
no attached service account/scopes, and internal IP `10.128.0.2`.
The initially attached static external IP `34.132.93.42` and its reservation
`prepalgo-executor-ip` were removed on user request. There is now **no public IP**.
Firewall rules scoped to the executor tag allow IAP SSH and private TCP 443
from the `prepalgo-api` network tag at priority 1000, then deny all other ingress
at 1100 so broader default-network rules do not expose management ports.

Node 22.23.4, distro Docker and Caddy are installed. The secret-free executor
bundle runs under systemd on loopback 8081, with the official Python image
pinned to `python@sha256:79440cc1dfa86a5f98d67efcd219726a8e9d8083cc0aafd27c7bef5976c38868`.
Readiness succeeds. Real VM Docker acceptance passed kernel network/cgroup/
identity checks, OOM/timeout limits, HTTP overload, disconnect cancellation and
recovery. This small host is still a capacity trial, not a production SLA.

Caddy now listens on private `10.128.0.2:443`, forwarding only to loopback 8081.
Its self-signed, IP-SAN, non-CA certificate is explicitly trusted through
`backend/config/executor-trust.crt` and `NODE_EXTRA_CA_CERTS`; the private key
stays on the VM. TLS verification is never disabled. The Namecheap
`executor -> 34.132.93.42` A record was deleted because that address is no
longer ours. The old hostname remains only the OIDC audience identifier, which
does not require DNS resolution.

`prepalgo-run` (`10.10.0.0/26`, us-central1) is the Cloud Run Direct VPC egress
subnet. Candidate configuration uses `private-ranges-only`, leaving Neon,
Redis and other public destinations on normal Cloud Run egress. There is no
connector, NAT gateway or load balancer. Private Google Access is enabled on
the VM subnet so `www.googleapis.com/oauth2/v1/certs` remains reachable for
OIDC verification without general internet access.

A temporary Cloud Run job using the existing API identity verified private TLS
readiness, anonymous 401, invalid-token 403, real Google OIDC execution and timeout
enforcement, then passed again after a VM stop/start. Both systemd services
recovered automatically. The temporary job was removed afterward. No live
application revision or traffic was changed. The candidate
now calls as the dedicated `prepalgo-api` identity, which is the executor's only
allowed caller.

Releasing the address removes its ongoing $0.005/hour charge. Compute/disk
free-tier allowances remain account-wide and usage-dependent; VPC traffic,
Cloud Run execution, logs and other services can still be billed. A billing budget
and the budget-guard shutoff are active (see `scripts/budget-guard/README.md`).

### Private host maintenance

Initial setup: after installing dependencies and the pinned image with an
approved internet path, run `scripts/executor/configure-private-host.sh 10.128.0.2`
as root. Export **only** `/etc/caddy/executor-tls/server.crt` to
`backend/config/executor-trust.crt`; never copy a `.key`. Re-running the script
preserves the certificate and fails if it is within 30 days of expiry. Changing
the private IP requires a matching certificate and candidate config.

**Patching (manual, quarterly plus urgent fixes).** The VM has no internet path,
and Private Google Access does not reach Ubuntu, npm or Docker Hub. Run
`scripts/executor/patch-window.sh` from a workstation. It refuses to start
unless the deny-all ingress rule is intact and no external address exists. It
then attaches an ephemeral IP (outbound only, about $0.005/hour), runs
`apt full-upgrade`, and updates the tarball-installed Node 22 to the latest
checksum-verified release, keeping `/opt/prepalgo-node.prev` for rollback. It
removes the IP on every exit path and reboots if required. Finally it verifies
Docker, Caddy, the executor, the pinned image, private TLS readiness and the
certificate lifetime. Grading is unavailable for about a minute during a reboot.
`--check` verifies without changing anything. Run it quarterly, and out of cycle
for kernel, Docker/runc or Node security fixes: this host runs untrusted code.
The Python sandbox image stays digest-pinned. Changing it is a deliberate
`configure-host.sh` redeploy, not part of patching. No NAT, scheduler or
privileged automation identity is used. The first window ran on 2026-10-29.

**Certificate rotation (yearly; current expiry 2027-10-28).** `rotate-cert.sh`
runs on the VM over IAP (`--command='sudo bash -s -- <cmd> 10.128.0.2' <
scripts/executor/rotate-cert.sh`):

1. `stage` creates an inactive `next.key`/`next.crt` and prints the public
   certificate.
2. Append it to `backend/config/executor-trust.crt` (old + new; tests accept at
   most two). Deploy and promote that backend.
3. `activate` switches Caddy to the new pair, verifies readiness, and restores
   the old pair if verification fails.
4. In the next release, remove the old certificate from the trust bundle.

`status` lists the active, staged and previous certificates.

**Reminders.** `.github/workflows/executor-maintenance.yml` runs free each month.
It opens a patch-window issue in January, April, July and October. It opens a
rotation issue when the newest trusted certificate has fewer than 60 days left,
and fails when fewer than 30 remain. `npm test` fails at that point too.
GitHub pauses schedules after 60 days without repository activity.

## Low-cost executor rollout

Start with a dedicated GCE `e2-micro` trial in `us-central1` (close to the current
API), then measure before sizing up. Its 1 GiB RAM and burstable CPU are a
**testing hypothesis**, not established production capacity. Use a standard
persistent disk within the current free-tier allowance if eligible. The free
tier is shared across the billing account; external IPv4, egress, extra disk,
logs/monitoring and other services can still be billed. Do not add a load balancer,
NAT gateway or VPC connector merely to host one small executor. Review the
[current GCP free-tier](https://cloud.google.com/free/docs/free-cloud-features) and
[network pricing](https://cloud.google.com/vpc/network-pricing) before provisioning.

Reference VM creation command for future rebuilds (requires cost approval;
use the private-only configuration below):

```sh
gcloud compute instances create prepalgo-executor \
  --project=prepalgo --zone=us-central1-a --machine-type=e2-micro \
  --image-family=ubuntu-2404-lts-amd64 --image-project=ubuntu-os-cloud \
  --boot-disk-size=20GB --boot-disk-type=pd-standard \
  --no-service-account --no-scopes --tags=prepalgo-executor \
  --no-address \
  --shielded-secure-boot
```

Attach no Google service account to this VM: it does not need API, database or
Secret Manager access. Use SSH through IAP with narrowly scoped firewall rules,
and private HTTPS ingress only from the tagged API revision. Never expose port
8081 or Docker ports 2375/2376. Configure private TLS and explicit client trust
before connecting the API; no public DNS or public address is needed.

Install supported Node 22 at `/usr/bin/node`, Docker and Caddy on the host using
their documented package sources. Enable OS security updates. Verify the Python
image provenance/digest, pull it explicitly for the host architecture, then stage
only the allowlisted package:

```sh
node scripts/executor/package.mjs /ABSOLUTE/PATH/OUTSIDE/THE/REPOSITORY
# Transfer the returned directory to /opt/prepalgo-executor on the dedicated host.
# On the host, in /opt/prepalgo-executor:
npm ci --omit=dev
```

Do not upload `backend/.env`, your full checkout, local `node_modules`, personal
credentials or the Mongo import. The package script copies only the entrypoint,
its runtime modules and locked dependency manifests.

Create a system account `prepalgo-executor` without a login shell and add it to
the Docker group. Docker access is effectively host-root access: dedicate the
entire host to this workload. Install
`scripts/executor/prepalgo-executor.service` under `/etc/systemd/system/`.
The supervisor is capped separately from its sibling Docker containers; configure
host-level monitoring for the combined footprint.

Create `/etc/prepalgo-executor.env`, root-owned mode 0600:

```sh
EXECUTOR_AUDIENCE=https://executor.YOUR_DOMAIN
EXECUTOR_CALLERS=YOUR_API_SERVICE_ACCOUNT
CODE_SANDBOX_IMAGE=python@sha256:VERIFIED_64_HEX_DIGEST
```

For an explicitly approved public-host alternative only, install
`scripts/executor/Caddyfile` at `/etc/caddy/Caddyfile` and set
`EXECUTOR_DOMAIN` for the Caddy service to the DNS hostname (no scheme). The Node
executor binds loopback by default; `EXECUTOR_BIND_ADDRESS` is an explicit opt-in
for a different binding. The audience must exactly match what the API requests.
Start the services and verify `/health/ready`; startup checks Docker and the
pre-pulled image, and readiness periodically reprobes Docker.

Before granting production traffic, verify a real Cloud Run service-account
token succeeds, no/mismatched identity fails, client disconnects clean up running
containers, overload returns 503, and reboot restores the service. Run:

```sh
RUN_DOCKER_ACCEPTANCE=1 node --test backend/tests/executorDocker.test.js
CODE_SANDBOX_MODE=docker node --test \
  backend/tests/codeExecution.test.js backend/tests/opsDriver.test.js
```

The standalone package deliberately excludes tests; run acceptance from a
separate clean, secret-free source checkout on the staging host.

### Mac mini and alternatives

A Mac mini is viable for **private preproduction testing** if it is already
available. Use a dedicated Linux VM, no personal/shared folder mounts, no API or
cloud credentials, and no unrelated containers. Disable sleep and plan for
power, ISP, reboot and patch outages. Tailscale secures transport, **not**
untrusted execution. A home machine or the shared Docker environment on a daily
development laptop is not the recommended public tenant boundary.

Two network paths are possible:

* **Private tailnet:** Tailscale Serve on the executor VM; Cloud Run joins with
  ephemeral, narrowly tagged nodes in userspace mode. ACLs/grants permit only
  API-to-executor HTTPS, no access to the rest of the tailnet. Node's current
  `fetch` transport has no SOCKS proxy integration; simply setting `ALL_PROXY`
  is not sufficient. This option needs explicit proxy/sidecar integration and
  cancellation tests before use.
* **Public HTTPS via Funnel:** Cloud Run uses the existing HTTPS/OIDC protocol
  without joining the tailnet. Only the executor service is exposed; Google OIDC
  allowlisting stays mandatory. Funnel is public, beta and bandwidth-limited,
  so it is a testing convenience, not an availability guarantee. TLS terminates
  on your Tailscale node, not at a decrypting Funnel relay.

See the official [Cloud Run integration](https://tailscale.com/kb/1108/cloudrun),
[Funnel behavior and limits](https://tailscale.com/kb/1223/funnel) and
[plan terms](https://tailscale.com/pricing). Do not assume the Personal plan covers
a commercial app.

A small Hetzner Linux VPS is another Docker-compatible low-cost option, but
select a region close to the API and check current checkout pricing, IPv4, tax
and transfer. Fly Machines or a managed sandbox provider can reduce idle cost,
but require adapting our runner to their per-execution isolation/API model;
they are not drop-in hosts for the existing Docker-daemon runner. No provider
price or free-tier eligibility has been reserved or guaranteed.

The remainder records the original local sandbox decision; production fallback
statements below are superseded by this update.

## Context
The platform runs user-submitted Python against test cases. Until now that code
was written to a temp file and handed to a bare `spawn('python3', [file])`: it
inherited the backend's filesystem, network namespace, and environment. Any
submission could read `.env`, call the database (then MongoDB Atlas) or Upstash directly, or make
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

**One sandbox per submission.** All test cases of a submission run in a single
container. The harness times each case in-process (`SIGALRM` per-case timer in
Python, a fresh `vm` realm plus a timer per case in JavaScript) and emits one
marker line per case. Container startup is therefore not counted as runtime and
a burstable executor is not drained by one launch per case. The per-case timer
is only for fairness and messages; the parent deadline (pending cases x 5s + 3s
startup, capped by the 15s submission budget) and `RLIMIT_CPU` stay the hard
limits. After a timeout the remaining cases are reported as skipped; Python
module-level state persists between cases (like LeetCode), JavaScript does not.
Programs are capped at `MAX_SOURCE_CHARS` (1,000,000, guard included; `policy.js`)
in every mode, so local verification enforces the executor's limit. A submission
whose tests would exceed it runs in consecutive sandboxes and stops at the first
time limit or crash.

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
Docker still shares its host's Linux kernel; container escape vulnerabilities
are possible. A dedicated patched host without application credentials reduces
blast radius but is not equivalent to a fresh microVM per submission. Reassess
gVisor/microVM isolation before exposing substantial public untrusted traffic.

Subprocess mode is **hardening**, not isolation. It has no kernel-level network
guarantee, and no in-interpreter sandbox can categorically prevent traversal of
`object.__subclasses__()`. It holds in practice because `-I -S` starts a fresh
interpreter in which `subprocess.Popen` never enters that graph. Docker mode is
the only configuration that provides true isolation and is the intended
production setting.

The original implementation had only Docker argument-composition tests. The
implementation update above records subsequent live local Docker acceptance;
the dedicated host and private authenticated path acceptance are recorded above.
Public-launch capacity and operational gates still apply.
