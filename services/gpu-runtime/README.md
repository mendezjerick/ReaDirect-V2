# ReaDirect GPU Runtime Coordination

This local Python package prevents the ASR and TTS service processes from
executing CUDA work at the same time when they share one physical GPU.

Both services use an OS-backed lock below `.runtime/gpu-locks` by default. The
lock is released automatically when its holder closes it or its process exits.
Each service retains its own bounded FIFO queue; the shared permit is acquired
only after a job reaches that service's inference worker.

Configuration:

- `READIRECT_GPU_COORDINATION_ENABLED=true` enables coordination when that
  service selects CUDA. CPU runtimes disable it automatically.
- `READIRECT_GPU_RESOURCE_KEY=cuda-default` identifies the physical GPU.
  Services sharing a GPU must use the same key. Services on different GPUs on
  the same host must use different keys.
- `READIRECT_GPU_PERMIT_TIMEOUT_SECONDS=150` bounds cross-service GPU waiting.
- `READIRECT_GPU_LOCK_DIRECTORY` may set a shared absolute lock directory when
  ASR and TTS are installed under different repository roots or containers.

The process guard permits one ASR process and one TTS process for each resource
key. This prevents multi-worker application servers from loading duplicate
copies of the same model. Scale a multi-GPU host using one service process per
GPU key, or disable this coordinator when an external GPU scheduler owns the
same responsibility.

This coordinator serializes GPU execution and temporary inference allocations.
It does not reduce the combined resident memory of the loaded ASR and TTS
models. Deployment sizing must still verify that both resident models fit on
the selected GPU.

## Deployment validation

The service health responses include a `capacity` block with the bounded
admission limit, current utilization, available queue slots, saturation state,
and cumulative overload response count. A CUDA deployment fails at service
startup if it is configured with more than one local inference worker.

Validate the live ASR/TTS pair and inspect device memory with:

```powershell
services\asr\.venv\Scripts\python.exe `
  services\gpu-runtime\scripts\validate_capacity.py `
  --require-cuda
```

An optional concurrent inference sample verifies both services under real
model load. It intentionally performs one ASR request and one uncached TTS
request while sampling GPU memory every 500 ms, so use a short fixture and
allow enough time for generation:

```powershell
services\asr\.venv\Scripts\python.exe `
  services\gpu-runtime\scripts\validate_capacity.py `
  --require-cuda `
  --exercise `
  --asr-audio services\asr\fixtures\distractors\silence\silence_0063.wav
```

The validator requires at least 1024 MiB of free GPU memory throughout the
sample by default. Override that deployment policy with
`--minimum-free-memory-mib` when the target GPU has a separately reviewed
headroom requirement.

Cloud staging starts the speech services without source reload, fixes Uvicorn
to one worker, waits for semantic readiness rather than an open port, and gives
an in-flight request up to 180 seconds to finish during graceful shutdown.
