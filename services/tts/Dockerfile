FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    READIRECT_TTS_STARTUP_WARMUP=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ffmpeg \
        libsndfile1 \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv

WORKDIR /opt/readirect
COPY services/gpu-runtime /opt/readirect/services/gpu-runtime
COPY services/tts/pyproject.toml services/tts/uv.lock /opt/readirect/services/tts/

# The repository lockfile selects CUDA wheels for local GPU development.
# Render's default CPU instances use the CPU PyTorch index instead.
RUN uv export \
        --directory /opt/readirect/services/tts \
        --no-dev \
        --format requirements.txt \
        --no-hashes > /tmp/tts-requirements.txt \
    && sed -i -E '/^-e \.\.\/gpu-runtime$/d;/^(torch|torchaudio|cuda-|nvidia-|triton)/d' /tmp/tts-requirements.txt \
    && pip install --index-url https://download.pytorch.org/whl/cpu \
        torch==2.11.0 torchaudio==2.11.0 \
    && pip install -r /tmp/tts-requirements.txt \
    && pip install -e /opt/readirect/services/gpu-runtime

COPY services/tts /opt/readirect/services/tts
COPY assets/audio/voice-references /opt/readirect/assets/audio/voice-references
WORKDIR /opt/readirect/services/tts

EXPOSE 10000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port=${PORT:-10000}"]
