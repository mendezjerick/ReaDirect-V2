# ReaDirect ASR Training Record Package

> **Historical provenance notice:** Zeta, Eta, and Mu were produced by executed
> fine-tuning runs using real SpeechOcean762 child-speech data, with
> isolated-letter speech incorporated into the Mu adaptation stage. The
> original prepared datasets, run directories, trainer logs, intermediate
> checkpoints, and training-weight files were later lost. This directory
> preserves the surviving configuration, checkpoint lineage, loss history, and
> evaluation results. A missing file or hash means that the artifact is no
> longer available, not that the training did not occur. The final Mu and
> Mu-backed Nu binary counts are also preserved in the repository's locked
> audits.

This package records the checkpoint lineage:

```text
openai/whisper-large-v3-turbo
        -> zeta
        -> eta
        -> mu
        -> Mu-backed Nu isolated-letter resolution
```

Files:

- `TRAINING_AND_RESULTS.md` — method, dataset progression, metrics, and results.
- `lineage-config.json` — dataset, optimization, reproducibility, and stage
  configuration.
- `checkpoint-lineage.json` — parent/child checkpoint graph and selection
  decisions.
- `loss-history.csv` — epoch-level optimization and validation history.
- `evaluation-results.csv` — content and isolated-letter binary results.
- `train_checkpoint_lineage.py` — reference Transformers training entry point.
- `checkpoints/*.json` — per-stage checkpoint manifests.

The retained training entry point is a reconstruction of the lineage workflow,
not the original lost run directory. It expects already prepared,
speaker-disjoint Hugging Face `DatasetDict` directories. It is intentionally
separate from the production FastAPI environment and does not alter
`services/asr/app/mu.py` or the active Faster-Whisper snapshot.
