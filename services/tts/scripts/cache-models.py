from pathlib import Path

from huggingface_hub import snapshot_download


service_root = Path(__file__).resolve().parents[1]

snapshot_download(
    repo_id="openbmb/VoxCPM2",
    local_dir=service_root / ".cache/models/openbmb--VoxCPM2",
)
