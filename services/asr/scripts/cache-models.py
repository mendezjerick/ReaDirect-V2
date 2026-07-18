from pathlib import Path

import whisper
from huggingface_hub import snapshot_download


service_root = Path(__file__).resolve().parents[1]
cache_root = service_root / ".cache"

whisper.load_model(
    "base",
    device="cpu",
    download_root=cache_root / "whisper",
)

snapshot_download(
    repo_id="mobiuslabsgmbh/faster-whisper-large-v3-turbo",
    local_dir=cache_root / "faster-whisper-large-v3-turbo",
)
