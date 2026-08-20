# DepEd Deployment and Hosting Handoff

**Document status:** Planning reference  
**Prepared:** July 28, 2026  
**Review before use:** DepEd infrastructure, security, privacy, and procurement
requirements may change. Revalidate this document with DepEd ICTS before an
actual deployment.

## Executive Summary

ReaDirect should first be proposed as a deployment on infrastructure already
operated or allocated by the Department of Education (DepEd), rather than as a
privately funded commercial hosting subscription.

DepEd has publicly documented cloud facilities and hybrid-cloud infrastructure.
The Department of Information and Communications Technology (DICT) also defines
Government Cloud (GovCloud) as infrastructure available to government agencies.
These facts establish that an appropriate government hosting route exists, but
they do not guarantee that a particular DepEd office will have an immediately
available virtual machine, storage allocation, or NVIDIA GPU for ReaDirect.

If DepEd allocates existing compute, storage, networking, backup, and
administrative capacity, the direct recurring hosting expense charged to the
project owner may be **PHP 0 per month**. DepEd would still absorb internal
operating costs such as server capacity, electricity, storage, backup, network
traffic, monitoring, and ICT staff time.

The main unresolved infrastructure question is GPU availability. A GPU is
preferred for responsive runtime VoxCPM2 speech generation, but it is not
required for an initial pilot:

- Live2D rendering runs in the learner's browser, not on a server GPU.
- Most fixed Clara dialogue is served from pre-generated, reviewed WAV files.
- ASR supports a CPU path.
- VoxCPM2 automatically falls back to CPU when CUDA is unavailable, although
  dynamic learner-specific speech will be slower.

The more immediate handoff risk is production packaging. ReaDirect currently has
local Windows bootstrap and launcher scripts plus a Cloudflare-based staging
launcher. It does not yet have a complete, DepEd-ready production installer,
operations runbook, backup procedure, or upgrade and rollback workflow.

## Confirmed Rights Status

The project owner reported the following as cleared for commercial deployment:

- Live2D model rights
- Commercial Live2D use
- Written permission for the voice
- Other relevant licensing

This memo records the owner's confirmation; it is not an independent legal
review. Copies of licenses and written permissions should be included in a
private handoff evidence package rather than committed to the public source
repository.

## Evidence That a Government Hosting Route Exists

1. DepEd reported that its Learner Information System was migrated to DepEd
   cloud facilities and provisioned for more than 100,000 daily users:
   [DepEd: Improved Learner Information System](https://www.deped.gov.ph/2018/08/10/teachers-to-have-less-work-at-night-more-productivity-by-day-with-improved-lis/).

2. DepEd published a head-office hybrid-infrastructure specification designed
   to host scalable workloads and Azure-consistent services in its data center:
   [DepEd Hybrid Infrastructure Technical Specification](https://www.deped.gov.ph/wp-content/uploads/2019/10/BD_2019-09-ICTS3008-BII-CB-014a.pdf).

3. DICT's Cloud First policy defines GovCloud as a hybrid deployment containing
   government-controlled resources and resources from eligible cloud service
   providers for government agencies:
   [DICT Department Circular No. 2017-002](https://cms-cdn.e.gov.ph/DICT/pdf/Signed_DICT-Circular_2017-002_CloudComp_2017Feb07.pdf).

4. The current government data-classification and residency framework should
   be reviewed when deployment begins, especially because ReaDirect handles
   learner accounts and transient voice inputs:
   [2026 Government Data Classification and Residency Update](https://pia.gov.ph/press-release/president-marcos-signs-eo-119-unlocking-digital-infrastructure-growth-and-strengthening-philippine-data-security/).

These sources demonstrate capability and policy direction. Actual access still
requires approval and resource allocation from the responsible DepEd ICT unit.

## Domain Versus Hosting

An existing DepEd domain eliminates the need to purchase a separate domain, but
a domain is only an address. It does not supply compute, database, file storage,
backup, monitoring, or GPU capacity.

DepEd must provide:

- A subdomain, such as an approved name below `deped.gov.ph`
- DNS configuration
- HTTPS certificate and gateway or reverse-proxy configuration
- One or more application servers or virtual machines
- Database and private file storage
- Backup and restore facilities
- Monitoring and log-retention facilities
- Optional CUDA-capable GPU capacity

A conventional government website-hosting account may not be sufficient for
ReaDirect because the system requires long-running PHP and Python services,
PostgreSQL, queues, WebSockets, transient speech processing, and local AI model
caches. The requested service should therefore be an application VM, private
cloud instance, or equivalent Infrastructure as a Service allocation.

## System Hosting Map

| Component | Server requirement | GPU requirement |
| --- | --- | --- |
| React/Vite production build | Static web delivery | None |
| Live2D runtime | Delivered as browser assets; rendered by the client | None on the server |
| Laravel API and Sanctum | PHP 8.3 application service | None |
| Laravel Octane/RoadRunner | Long-running PHP service | None |
| Laravel Reverb | WebSocket-capable service | None |
| Laravel Scheduler and database queue | Background Windows services or scheduled tasks | None |
| PostgreSQL | Managed database or private database service | None |
| Approved speech catalog and request scratch space | Catalog bundled with the release; bounded ephemeral scratch storage | None |
| ASR/Faster-Whisper | Python 3.11 service; CPU mode is supported | Optional |
| VoxCPM2 TTS | Python 3.11 service; CPU fallback is supported | Recommended for responsive dynamic speech |

Only the public web boundary should accept Internet traffic. PostgreSQL, ASR,
TTS, model caches, transient speech uploads, and administrative interfaces must remain on the
private network.

## Recommended Pilot Allocation

The following is a starting point for a controlled school or regional pilot,
not a national-scale sizing guarantee:

| Resource | Initial request |
| --- | --- |
| Operating system | Windows Server compatible with the approved ReaDirect Windows x64 stack |
| CPU | 12 logical CPU cores |
| Memory | 32 GB RAM |
| Storage | At least 250 GB SSD for model artifacts, release assets, caches, logs, and operational headroom |
| Database | PostgreSQL with scheduled backups and tested restoration |
| Public ingress | HTTPS on port 443 through DepEd's approved gateway |
| WebSockets | Supported through the gateway for Laravel Reverb |
| Internal services | Loopback or private-network access only |
| GPU | Optional NVIDIA CUDA-compatible GPU; provision after benchmarking if required |
| Monitoring | Service availability, CPU, RAM, disk, database, queue, and application error monitoring |

This single-server allocation favors a low-cost pilot. For a larger deployment,
separate the web/API workload, PostgreSQL, private storage, and speech workers so
that each can be secured and scaled independently.

Final sizing must be based on:

- Number of schools
- Simultaneous learners
- Expected speech-upload volume and ASR requests per minute
- Verification of the zero-retention raw-audio policy
- ASR requests per minute
- Dynamic TTS requests per minute
- Required response-time target
- Backup retention and disaster-recovery targets

## GPU Contingency

Use the following decision order:

1. Deploy the fixed published speech catalog and CPU-capable speech services.
2. Benchmark real ASR and dynamic TTS response times with the expected number of
   simultaneous learners.
3. If dynamic TTS is acceptably responsive, keep the CPU-only deployment.
4. If it is too slow, ask DepEd for an internal CUDA-capable worker.
5. Consider a paid external GPU service only if DepEd cannot allocate hardware
   and policy permits external processing.

The GPU worker does not need to be publicly accessible. The Laravel application
should call it through the private network, and generated audio should be cached
to avoid repeating identical work.

Where policy permits, a separate DepEd-managed GPU workstation can serve as the
TTS worker for a pilot. It should be treated as managed infrastructure with
restricted service credentials, health monitoring, and an operations owner—not
as a developer's personal computer.

## Current Repository Deployment Position

The repository currently documents and supports:

- A Windows x64 platform
- PowerShell bootstrap and local launchers
- PHP 8.3 and Laravel
- PostgreSQL
- Python 3.11 ASR and TTS services
- Caddy and Cloudflare-based developer staging
- Local, ignored AI model caches
- A licensed Live2D SDK directory that is intentionally not committed

Relevant project references:

- [Repository README](../README.md)
- [Approved Technology Stack](../READIRECT_REVAMP_TECH_STACK.md)
- [Development and Staging Launcher Standard](../READIRECT_REVAMP_DEVELOPMENT_AND_STAGING_LAUNCHER_STANDARD.md)
- [ASR Guide](../READIRECT_REVAMP_ASR_GUIDE.md)
- [VoxCPM2 TTS Specification](../READIRECT_REVAMP_CLARA_VOX_TTS_SPECIFICATION.md)
- [Live2D Specification](../READIRECT_REVAMP_CLARA_LIVE2D_SPECIFICATION.md)

The current staging launcher must not be treated as the production deployment.
DepEd may use its own DNS, gateway, certificate, load balancer, firewall, and
monitoring stack instead of Cloudflare.

## Production Handoff Package Still Required

Before DepEd is expected to deploy ReaDirect independently, prepare a versioned
release containing the following:

### Installation

- A prerequisite checker
- An idempotent PowerShell installation or deployment script
- Pinned runtime and dependency versions
- Production frontend build
- Laravel optimized production build
- Database creation, migration, and seed procedure
- Windows service installation through the approved service manager
- Scheduled-job installation
- Approved offline model and Live2D artifact transfer procedure
- File-integrity hashes for release artifacts and model files

### Configuration and Secrets

- A documented production environment template
- No real credentials or learner data in the repository
- DepEd-owned database, service, storage, and administrative credentials
- Secret rotation procedure
- Allowed-origin, trusted-proxy, cookie, session, and TLS configuration
- Private ASR and TTS service authentication or network restrictions

### Operations

- Start, stop, restart, and status commands
- Health endpoints and expected healthy responses
- Centralized logging guidance
- Disk-capacity alerts
- Queue and WebSocket monitoring
- AI-model warm-up and readiness checks
- Database backup and tested restore procedure
- Database and approved catalog backup procedure, plus temporary-audio cleanup verification
- Upgrade, rollback, and disaster-recovery procedures
- Named DepEd operational owner and escalation route

### Privacy and Security

- Learner-data inventory and classification
- Recording purpose, consent or lawful-basis review, and retention schedule
- Role-based access verification
- Encryption in transit and at rest
- Audit logging for sensitive staff actions
- Least-privilege service accounts
- Vulnerability assessment and penetration testing
- Dependency and model provenance records
- Incident-response and breach-notification procedure
- Review against current DepEd, DICT, and National Privacy Commission policies

### Acceptance Testing

- Fresh-machine installation test
- Database migration and restoration test
- Staff and learner authentication tests
- Role and school-boundary authorization tests
- Recording upload, playback, retention, and deletion tests
- Published speech-catalog integrity test
- ASR accuracy and latency test
- CPU and optional GPU TTS latency test
- WebSocket behavior through the DepEd gateway
- Load test at the agreed pilot concurrency
- Browser, microphone, mobile, and school-network compatibility tests
- Failure tests for unavailable speech services, full disks, and database loss

## Proposed DepEd Deployment Process

1. DepEd ICTS reviews the system architecture, data flows, licenses, security
   controls, and privacy impact.
2. DepEd assigns infrastructure and application owners.
3. DepEd provisions the VM or cloud instance, database, storage, backup,
   subdomain, TLS, firewall rules, and service accounts.
4. The project team supplies a signed or checksummed production release and
   private licensed artifacts through an approved transfer route.
5. DepEd runs the deployment installer using DepEd-owned credentials.
6. The project team and DepEd complete technical and user acceptance tests.
7. DepEd performs backup-and-restore and rollback drills before launch.
8. The system enters a limited pilot with monitoring and an agreed support
   window.
9. Capacity and GPU requirements are recalculated from pilot measurements.
10. DepEd approves, modifies, expands, or ends the deployment based on evidence.

## Request to Send to DepEd ICTS

> Can DepEd ICTS provision an application virtual machine or GovCloud IaaS
> instance for a Windows-based Laravel, PostgreSQL, and Python speech-processing
> system? The application requires private file storage, scheduled backups,
> HTTPS, WebSockets, internal long-running ASR and TTS services, and optional
> NVIDIA CUDA GPU access. For the initial pilot, the proposed allocation is 12
> logical CPU cores, 32 GB RAM, and at least 250 GB expandable SSD storage. If a
> GPU is not available, may we initially benchmark the supported CPU speech
> paths and request a private GPU worker only if measured latency requires one?

## Questions DepEd Must Answer

- Which office owns deployment: ICTS Central Office, a Regional Office, a
  Schools Division Office, or another group?
- Will ReaDirect use DepEd private cloud, DICT GovCloud, another approved cloud,
  or on-premises infrastructure?
- What operating systems and application deployment methods are supported?
- Can the receiving team provision a full VM, or only conventional web hosting?
- Is PostgreSQL available as a managed service, or should it run on the VM?
- Can DepEd provide automated PostgreSQL backups and approved model/catalog artifact delivery?
- Does DepEd approve zero retention for raw learner audio, and what residency rules apply to derived transcripts and scores?
- Is outbound Internet access allowed during installation?
- How must offline AI models and licensed assets be transferred and scanned?
- Is a CUDA-capable GPU or approved GPU service available?
- Which gateway terminates HTTPS, and does it support WebSockets?
- What availability, recovery-time, and recovery-point objectives are required?
- What vulnerability assessment, privacy review, and approval gates are
  required before pilot use?
- Who will operate, monitor, patch, back up, and support the system?
- What is the expected pilot and eventual production concurrency?

## Cost Position

### Preferred Case: Existing DepEd Infrastructure

| Item | Direct cost to project owner |
| --- | --- |
| DepEd subdomain | PHP 0 |
| Existing VM or GovCloud allocation | Potentially PHP 0 |
| Existing database and backup allocation | Potentially PHP 0 |
| Existing storage allocation | Potentially PHP 0 |
| Existing CPU speech capacity | Potentially PHP 0 |
| Existing GPU allocation | Potentially PHP 0, if available |

This does not mean the system has no operating cost. It means those costs may be
absorbed through already funded government infrastructure rather than billed to
the project owner.

### If DepEd Cannot Allocate Infrastructure

Commercial cloud prices and foreign-exchange rates change frequently. The
earlier planning estimate for a low-volume deployment was approximately:

- PHP 1,050 to PHP 2,550 per month for a low-cost external cloud pilot
- PHP 3,700 to PHP 6,500 per month for a Singapore-region deployment
- PHP 13,000 to PHP 15,500 per month for an always-on commercial GPU deployment

These are planning estimates, not procurement quotations. They must be refreshed
if external hosting becomes necessary. An always-on paid GPU should not be the
default budget approach.

## Recommended Decision

Proceed on the assumption that ReaDirect will be handed to DepEd as a
self-hosted government application.

Do not purchase a domain or commit to a permanent commercial GPU subscription.
First complete the production handoff package, request a DepEd VM and private
storage, pilot the supported CPU paths, and measure actual latency and capacity.
Add government-managed GPU capacity only when the measurements demonstrate that
it is necessary.
