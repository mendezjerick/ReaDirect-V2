# Vendored whisper.cpp source

This directory contains the minimal CPU source tree required by the ReaDirect
Android JNI bridge.

- Repository: `https://github.com/ggml-org/whisper.cpp.git`
- Commit: `1fe009caeda75f69bc864d6370b10674e45a92bd`
- Runtime license: MIT (`LICENSE`)

The source was copied from the locally checksum-pinned Slice 2 tooling checkout.
Android builds do not fetch native source code from the network.
