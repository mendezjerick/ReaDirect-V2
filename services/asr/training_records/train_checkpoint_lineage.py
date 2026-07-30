"""Reconstructed stage runner for the Large-v3-turbo -> Zeta -> Eta -> Mu lineage.

The original executed run directories and scripts are no longer available.
This retained runner reconstructs the surviving configuration and expected
stage boundaries; it is not the original historical training environment.

The runner expects one Hugging Face DatasetDict saved to disk per stage:

    <data-root>/zeta
    <data-root>/eta
    <data-root>/mu

Each DatasetDict must contain train, validation, and test splits with `audio`
and `text` columns. The stage datasets own their augmentation policy; this
runner intentionally performs no stochastic waveform transformation.
"""

from __future__ import annotations

import argparse
import json
import os
import random
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np


@dataclass
class SpeechSeq2SeqCollator:
    processor: Any
    decoder_start_token_id: int

    def __call__(self, features: list[dict[str, Any]]) -> dict[str, Any]:
        import torch

        input_features = [
            {"input_features": feature["input_features"]} for feature in features
        ]
        batch = self.processor.feature_extractor.pad(
            input_features,
            return_tensors="pt",
        )

        label_features = [{"input_ids": feature["labels"]} for feature in features]
        labels_batch = self.processor.tokenizer.pad(
            label_features,
            return_tensors="pt",
        )
        labels = labels_batch["input_ids"].masked_fill(
            labels_batch["attention_mask"].ne(1),
            -100,
        )
        if (labels[:, 0] == self.decoder_start_token_id).all().cpu().item():
            labels = labels[:, 1:]
        batch["labels"] = labels
        return batch


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--config",
        type=Path,
        default=Path(__file__).with_name("lineage-config.json"),
    )
    parser.add_argument("--data-root", type=Path, required=True)
    parser.add_argument("--output-root", type=Path, required=True)
    parser.add_argument(
        "--stage",
        choices=("zeta", "eta", "mu", "all"),
        default="all",
    )
    parser.add_argument(
        "--parent-model",
        help="Required for a standalone Eta or Mu run; path or model ID of its parent.",
    )
    return parser.parse_args()


def set_seed(seed: int) -> None:
    import torch

    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.use_deterministic_algorithms(True, warn_only=True)


def prepare_dataset(
    dataset: Any,
    processor: Any,
    language: str,
    task: str,
) -> Any:
    from datasets import Audio

    dataset = dataset.cast_column(
        "audio",
        Audio(sampling_rate=processor.feature_extractor.sampling_rate),
    )

    def prepare(example: dict[str, Any]) -> dict[str, Any]:
        audio = example["audio"]
        example["input_features"] = processor.feature_extractor(
            audio["array"],
            sampling_rate=audio["sampling_rate"],
        ).input_features[0]
        example["labels"] = processor.tokenizer(
            example["text"],
            add_special_tokens=True,
        ).input_ids
        return example

    processor.tokenizer.set_prefix_tokens(language=language, task=task)
    return dataset.map(
        prepare,
        remove_columns=dataset["train"].column_names,
        desc="Preparing Whisper log-Mel features and labels",
    )


def build_metrics(processor: Any) -> Any:
    import evaluate

    wer_metric = evaluate.load("wer")
    cer_metric = evaluate.load("cer")

    def normalize_transcript(value: str) -> str:
        return " ".join(re.findall(r"[a-z0-9']+", value.lower()))

    def compute_metrics(prediction: Any) -> dict[str, float]:
        prediction_ids = prediction.predictions
        label_ids = prediction.label_ids
        label_ids[label_ids == -100] = processor.tokenizer.pad_token_id
        predictions = [
            normalize_transcript(value)
            for value in processor.tokenizer.batch_decode(
                prediction_ids,
                skip_special_tokens=True,
            )
        ]
        references = [
            normalize_transcript(value)
            for value in processor.tokenizer.batch_decode(
                label_ids,
                skip_special_tokens=True,
            )
        ]
        return {
            "wer": 100.0
            * wer_metric.compute(predictions=predictions, references=references),
            "cer": 100.0
            * cer_metric.compute(predictions=predictions, references=references),
        }

    return compute_metrics


def train_stage(
    stage: dict[str, Any],
    shared: dict[str, Any],
    parent_path: str,
    data_root: Path,
    output_root: Path,
    language: str,
    task: str,
    seed: int,
) -> Path:
    from datasets import load_from_disk
    from transformers import (
        AutoModelForSpeechSeq2Seq,
        AutoProcessor,
        Seq2SeqTrainer,
        Seq2SeqTrainingArguments,
    )

    name = str(stage["name"])
    stage_output = output_root / name
    dataset = load_from_disk(str(data_root / name))
    processor = AutoProcessor.from_pretrained(parent_path)
    model = AutoModelForSpeechSeq2Seq.from_pretrained(
        parent_path,
        low_cpu_mem_usage=True,
        use_safetensors=True,
    )
    model.generation_config.language = language
    model.generation_config.task = task
    model.generation_config.forced_decoder_ids = None
    model.config.use_cache = False

    prepared = prepare_dataset(dataset, processor, language, task)
    arguments = Seq2SeqTrainingArguments(
        output_dir=str(stage_output),
        run_name=f"readirect-{name}",
        num_train_epochs=float(stage["epochs"]),
        learning_rate=float(stage["learning_rate"]),
        warmup_ratio=float(stage["warmup_ratio"]),
        lr_scheduler_type=str(shared["lr_scheduler_type"]),
        optim=str(shared["optimizer"]),
        adam_beta1=float(shared["adam_beta1"]),
        adam_beta2=float(shared["adam_beta2"]),
        adam_epsilon=float(shared["adam_epsilon"]),
        weight_decay=float(shared["weight_decay"]),
        max_grad_norm=float(shared["max_grad_norm"]),
        per_device_train_batch_size=int(shared["per_device_train_batch_size"]),
        per_device_eval_batch_size=int(shared["per_device_eval_batch_size"]),
        gradient_accumulation_steps=int(shared["gradient_accumulation_steps"]),
        gradient_checkpointing=bool(shared["gradient_checkpointing"]),
        fp16=bool(shared["fp16"]),
        predict_with_generate=bool(shared["predict_with_generate"]),
        generation_num_beams=int(shared["generation_num_beams"]),
        generation_max_length=int(shared["generation_max_length"]),
        label_smoothing_factor=float(shared["label_smoothing_factor"]),
        eval_strategy="steps",
        eval_steps=int(stage["evaluation_steps"]),
        save_strategy="steps",
        save_steps=int(stage["save_steps"]),
        logging_strategy="steps",
        logging_steps=max(1, int(stage["evaluation_steps"]) // 5),
        load_best_model_at_end=bool(shared["load_best_model_at_end"]),
        metric_for_best_model=str(shared["metric_for_best_model"]),
        greater_is_better=bool(shared["greater_is_better"]),
        save_total_limit=int(shared["save_total_limit"]),
        seed=seed,
        data_seed=seed,
        full_determinism=True,
        report_to=["tensorboard"],
        remove_unused_columns=False,
    )
    trainer = Seq2SeqTrainer(
        model=model,
        args=arguments,
        train_dataset=prepared["train"],
        eval_dataset=prepared["validation"],
        data_collator=SpeechSeq2SeqCollator(
            processor=processor,
            decoder_start_token_id=model.config.decoder_start_token_id,
        ),
        compute_metrics=build_metrics(processor),
        processing_class=processor,
    )
    trainer.train()
    trainer.save_model(str(stage_output / "selected"))
    processor.save_pretrained(str(stage_output / "selected"))
    test_metrics = trainer.evaluate(
        eval_dataset=prepared["test"],
        metric_key_prefix="test",
    )
    with (stage_output / "test-metrics.json").open("w", encoding="utf-8") as output:
        json.dump(test_metrics, output, indent=2, sort_keys=True)
    return stage_output / "selected"


def main() -> None:
    args = parse_args()
    with args.config.open(encoding="utf-8") as source:
        config = json.load(source)

    os.environ["CUBLAS_WORKSPACE_CONFIG"] = ":4096:8"
    seed = int(config["reproducibility"]["seed"])
    set_seed(seed)

    parent_path = str(config["base_model"]["model_id"])
    stage_by_name = {stage["name"]: stage for stage in config["stages"]}
    if args.stage != "all":
        if args.stage != "zeta" and not args.parent_model:
            raise ValueError("--parent-model is required for a standalone Eta or Mu run")
        train_stage(
            stage=stage_by_name[args.stage],
            shared=config["shared_training"],
            parent_path=args.parent_model or parent_path,
            data_root=args.data_root,
            output_root=args.output_root,
            language=str(config["base_model"]["language"]),
            task=str(config["base_model"]["task"]),
            seed=seed,
        )
        return

    for stage_name in ("zeta", "eta", "mu"):
        parent_path = str(
            train_stage(
                stage=stage_by_name[stage_name],
                shared=config["shared_training"],
                parent_path=parent_path,
                data_root=args.data_root,
                output_root=args.output_root,
                language=str(config["base_model"]["language"]),
                task=str(config["base_model"]["task"]),
                seed=seed,
            )
        )


if __name__ == "__main__":
    main()
