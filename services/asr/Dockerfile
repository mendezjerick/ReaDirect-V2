FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    MU_DEVICE=cpu \
    MU_COMPUTE_TYPE=int8 \
    MU_ALLOW_DOWNLOAD=false \
    MU_MODEL_PATH=/opt/readirect/services/asr/model_artifacts/mu

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ffmpeg \
        libsndfile1 \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv

WORKDIR /opt/readirect
COPY services/gpu-runtime /opt/readirect/services/gpu-runtime
COPY services/asr/pyproject.toml services/asr/uv.lock /opt/readirect/services/asr/

# The repository lockfile selects CUDA wheels for local GPU development.
# Render's default CPU instances use the CPU PyTorch index instead.
RUN uv export \
        --directory /opt/readirect/services/asr \
        --no-dev \
        --format requirements.txt \
        --no-hashes > /tmp/asr-requirements.txt \
    && sed -i -E '/^-e \.\.\/gpu-runtime$/d;/^(torch|torchaudio|cuda-|nvidia-|triton)/d' /tmp/asr-requirements.txt \
    && pip install --index-url https://download.pytorch.org/whl/cpu \
        torch==2.11.0 torchaudio==2.11.0 \
    && pip install -r /tmp/asr-requirements.txt \
    && pip install -e /opt/readirect/services/gpu-runtime

COPY services/asr /opt/readirect/services/asr
WORKDIR /opt/readirect/services/asr

EXPOSE 10000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port=${PORT:-10000}"]
