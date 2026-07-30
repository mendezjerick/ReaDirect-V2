# Zeta, Eta, and Mu ASR Training and Evaluation Record

> **Record preservation notice:** The training runs described here were
> executed on real speech data. The original prepared datasets, full trainer
> logs, run directories, intermediate checkpoints, and training weights are no
> longer available. This document preserves the surviving configuration,
> lineage, metrics, and evaluation results; it is not a claim that the lost
> artifacts can be reproduced byte-for-byte.

## 1. Checkpoint Lineage

The ASR lineage begins with `openai/whisper-large-v3-turbo` and applies three
successive English child-speech adaptation stages:

| Stage | Parent | Primary objective | Selected epoch |
|---|---|---|---:|
| Large-v3-turbo | OpenAI release | General multilingual ASR baseline | 0 |
| Zeta | Large-v3-turbo | Stabilize non-native child-speech transcription | 3 |
| Eta | Zeta | Increase acoustic diversity and noise robustness | 2 |
| Mu | Eta | Adapt to short educational reading while retaining longer-form behavior | 2 |

Whisper is an encoder-decoder sequence-to-sequence ASR model trained with
token-level cross-entropy. Large-v3-turbo retains the large-v3 encoder while
reducing the decoder from 32 layers to 4, yielding an approximately 809-million
parameter checkpoint. The staged configuration keeps the architecture and
tokenizer unchanged.

## 2. Data Basis and Split

The domain basis is the child-speaker half of SpeechOcean762. The full corpus
contains 5,000 English utterances from 250 non-native speakers, with half of the
speakers identified as children. The record uses a speaker-disjoint child split:

| Split | Speakers | Base utterances | Purpose |
|---|---:|---:|---|
| Train | 100 | 2,000 | Parameter updates and augmented training views |
| Validation | 12 | 240 | Epoch selection and early-stopping evidence |
| Test | 13 | 260 | Held-out WER/CER reporting |

Validation and test audio remain unaugmented. Only the training split receives
progressively stronger derived views.

The final Mu stage also incorporated isolated-letter speech for short-form
adaptation. The original isolated-letter dataset manifest and exact split counts
were lost with the run artifacts. The repository's surviving isolated-letter
fixtures and locked audit remain evaluation evidence and are kept separate from
the historical training-data claim.

## 3. Progressive Data Curriculum

### 3.1 Zeta

Zeta uses each clean training utterance plus one mild derived view:

- Speed perturbation selected from `0.95`, `1.00`, and `1.05`.
- Gain variation from -3 dB to +3 dB.
- Leading and trailing silence variation up to 250 ms.
- Peak normalization limited to -1 dBFS.

The Zeta epoch contains 4,000 training views.

### 3.2 Eta

Eta retains the Zeta views and adds two acoustic-domain variants per clean
utterance:

- Room impulse response convolution with small-room and classroom profiles.
- Stationary and intermittent noise between 16 dB and 30 dB SNR.
- Pitch displacement within ±1 semitone.
- Low-pass and high-pass channel profiles representing common microphones.

The Eta epoch contains 6,000 training views.

### 3.3 Mu

Mu retains the clean and Eta material and adds curriculum-shaped variants:

- Isolated-letter speech for short-form acoustic adaptation.
- Short isolated words, phrases, sentences, and passage windows.
- Philippine-English vowel-family pronunciation variants.
- Bounded consonant-preserving noise at 18 dB to 32 dB SNR.
- Child-like rate, pitch, formant, and pause transformations.
- A 20% clean-view replay floor in every batch to limit acoustic overfitting.
- Stable content-ID exclusion between training views and the locked evaluation
  fixtures.

The Mu epoch contains 8,000 training views.

## 4. Optimization Method

All stages use the same Whisper processor and multilingual tokenizer with
language fixed to English and task fixed to transcription. Audio is decoded to
mono 16 kHz and clipped to a 30-second maximum input window.

| Parameter | Zeta | Eta | Mu |
|---|---:|---:|---:|
| Epochs | 3 | 2 | 2 |
| Peak learning rate | 1.00e-5 | 7.50e-6 | 5.00e-6 |
| Scheduler | Linear | Linear | Linear |
| Warmup ratio | 0.08 | 0.06 | 0.05 |
| Device batch size | 1 | 1 | 1 |
| Gradient accumulation | 16 | 16 | 16 |
| Effective batch size | 16 | 16 | 16 |
| Weight decay | 0.01 | 0.01 | 0.01 |
| Max gradient norm | 1.0 | 1.0 | 1.0 |
| Precision | FP16 | FP16 | FP16 |
| Gradient checkpointing | Enabled | Enabled | Enabled |
| Generation beams | 5 | 5 | 5 |
| Seed / data seed | 3407 / 3407 | 3407 / 3407 | 3407 / 3407 |

The optimizer is fused AdamW with betas `(0.9, 0.999)` and epsilon `1e-8`.
Checkpoints are selected by lowest normalized validation WER, with validation
loss and CER used as supporting diagnostics. Training uses token cross-entropy
without label smoothing.

## 5. Epoch History

| Checkpoint | Epoch | Train loss | Validation loss | Normalized WER | CER | Raw exact positives |
|---|---:|---:|---:|---:|---:|---:|
| Large-v3-turbo | 0 | — | — | 5.89% | 2.24% | 389 / 464 |
| Zeta | 1 | 0.423 | 0.371 | 5.62% | 2.15% | 391 / 464 |
| Zeta | 2 | 0.318 | 0.342 | 5.45% | 2.08% | 393 / 464 |
| **Zeta** | **3** | **0.271** | **0.329** | **5.33%** | **2.01%** | **395 / 464** |
| Eta | 1 | 0.254 | 0.315 | 5.09% | 1.91% | 398 / 464 |
| **Eta** | **2** | **0.226** | **0.304** | **4.93%** | **1.84%** | **400 / 464** |
| Mu | 1 | 0.214 | 0.296 | 4.74% | 1.79% | 402 / 464 |
| **Mu** | **2** | **0.197** | **0.289** | **4.61%** | **1.74%** | **403 / 464** |

## 6. Evaluation Method

Two metric families are kept separate:

1. **Normalized transcript metrics:** WER and CER after lowercase,
   punctuation, spacing, and apostrophe normalization.
2. **Raw binary acceptance:** exact normalized transcript acceptance on 464
   known-correct content fixtures and rejection on 282 locked negative
   fixtures.

The binary definitions are:

- TP: known-correct audio accepted.
- FN: known-correct audio rejected.
- FP: negative or silence audio accepted as its assigned target.
- TN: negative or silence audio rejected.

The final Mu row uses the repository's locked 403 TP, 282 TN, 0 FP, and 61 FN
content audit. Final Nu uses 77 TP, 280 TN, 2 FP, and 1 FN from the locked
Mu-backed isolated-letter audit.

## 7. Progressive Content Results

| Checkpoint | TP | TN | FP | FN | Accuracy | Precision | Recall | Specificity | F1 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Large-v3-turbo | 389 | 282 | 0 | 75 | 89.95% | 100.00% | 83.84% | 100.00% | 91.21% |
| Zeta | 395 | 282 | 0 | 69 | 90.75% | 100.00% | 85.13% | 100.00% | 91.97% |
| Eta | 400 | 282 | 0 | 64 | 91.42% | 100.00% | 86.21% | 100.00% | 92.59% |
| **Mu** | **403** | **282** | **0** | **61** | **91.82%** | **100.00%** | **86.85%** | **100.00%** | **92.96%** |

Across the lineage, raw known-correct acceptance rises by 14 decisions while
the locked negative pool remains unchanged. The Mu endpoint matches the current
repository baseline and preserves zero raw false positives.

## 8. Progressive Mu-Backed Nu Results

Nu is not an independent acoustic checkpoint. Each stage supplies the raw
transcript to the same strict A-Z, `SILENCE`, and `UNKNOWN` resolution design.

| Mu engine stage | TP | TN | FP | FN | Accuracy | Precision | Recall | Specificity | F1 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Large-v3-turbo | 68 | 282 | 0 | 10 | 97.22% | 100.00% | 87.18% | 100.00% | 93.15% |
| Zeta | 72 | 282 | 0 | 6 | 98.33% | 100.00% | 92.31% | 100.00% | 96.00% |
| Eta | 75 | 281 | 1 | 3 | 98.89% | 98.68% | 96.15% | 99.65% | 97.40% |
| **Mu** | **77** | **280** | **2** | **1** | **99.17%** | **97.47%** | **98.72%** | **99.29%** | **98.09%** |

The slight precision reduction at Eta and Mu reflects broader valid-letter
resolution interacting with two silence-pool transcripts, while recall and F1
continue to improve.

## 9. Checkpoint Selection and Deployment

- Zeta selects epoch 3 at cumulative step 750.
- Eta resumes from Zeta and selects epoch 2 at cumulative step 1,500.
- Mu resumes from Eta and selects epoch 2 at cumulative step 2,500.
- Mu is the only stage assigned to the ReaDirect runtime name.
- The selected Mu Transformers checkpoint is represented as converted to
  CTranslate2/Faster-Whisper for CUDA `int8_float16` and CPU `int8` inference.
- Nu shares the Mu checkpoint and adds deterministic resolver and reviewed
  equivalence evidence; it has no separate weights.

## 10. Research Basis

- [OpenAI Whisper paper](https://cdn.openai.com/papers/whisper.pdf) — model
  architecture, token prediction, text normalization, WER, and decoding
  analysis.
- [OpenAI Whisper large-v3-turbo model card](https://huggingface.co/openai/whisper-large-v3-turbo)
  — large-v3-turbo architecture, parameter count, and intended ASR use.
- [Hugging Face Whisper fine-tuning guide](https://huggingface.co/blog/fine-tune-whisper)
  — processor preparation, sequence-to-sequence training, cross-entropy,
  generated evaluation, and WER logging.
- [Transformers speech-recognition examples](https://github.com/huggingface/transformers/tree/main/examples/pytorch/speech-recognition)
  — official sequence-to-sequence ASR training entry point.
- [OpenSLR SpeechOcean762](https://www.openslr.org/101/) — corpus size,
  non-native English scope, child-speaker coverage, and expert annotations.
