"""Single-file Unsloth alternative to the Axolotl YAML.

Use this when Axolotl is unavailable or you want a faster iteration
loop. Same target as axolotl_qlora.yaml: Qwen2.5-7B-Instruct QLoRA on
the ShareGPT JSONL emitted by synthetic_data_generator.py.

Usage:
    pip install -r training/requirements-train.txt
    python training/unsloth_train.py \
        --data training/data/train.jsonl \
        --output training/output \
        --epochs 3
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path

# Unsloth must be imported FIRST — it patches transformers for speed.
from unsloth import FastLanguageModel  # type: ignore
from unsloth.chat_templates import get_chat_template  # type: ignore
from datasets import load_dataset
from trl import SFTTrainer  # type: ignore
from transformers import TrainingArguments  # type: ignore


MAX_SEQ_LEN = 8192
BASE_MODEL = os.environ.get("BASE_MODEL", "Qwen/Qwen2.5-7B-Instruct")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--data", required=True, type=Path)
    p.add_argument("--output", required=True, type=Path)
    p.add_argument("--epochs", type=int, default=3)
    p.add_argument("--batch", type=int, default=1)
    p.add_argument("--grad_accum", type=int, default=8)
    p.add_argument("--lr", type=float, default=2e-4)
    return p.parse_args()


def main() -> None:
    args = parse_args()
    args.output.mkdir(parents=True, exist_ok=True)

    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=BASE_MODEL,
        max_seq_length=MAX_SEQ_LEN,
        load_in_4bit=True,
        dtype=None,  # auto
    )

    model = FastLanguageModel.get_peft_model(
        model,
        r=32,
        lora_alpha=64,
        lora_dropout=0.05,
        target_modules=[
            "q_proj", "k_proj", "v_proj", "o_proj",
            "gate_proj", "up_proj", "down_proj",
        ],
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=42,
    )

    tokenizer = get_chat_template(tokenizer, chat_template="chatml")

    # ShareGPT → ChatML string. Each row in train.jsonl is shaped:
    #   {"conversations": [{"from": "system", "value": "..."}, ...]}
    def format_row(row: dict) -> dict:
        convs = row["conversations"]
        text = tokenizer.apply_chat_template(
            [{"role": _role(c["from"]), "content": c["value"]} for c in convs],
            tokenize=False,
            add_generation_prompt=False,
        )
        return {"text": text}

    ds = load_dataset("json", data_files=str(args.data), split="train")
    ds = ds.map(format_row, remove_columns=ds.column_names)

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=ds,
        dataset_text_field="text",
        max_seq_length=MAX_SEQ_LEN,
        packing=True,
        args=TrainingArguments(
            per_device_train_batch_size=args.batch,
            gradient_accumulation_steps=args.grad_accum,
            num_train_epochs=args.epochs,
            learning_rate=args.lr,
            warmup_ratio=0.05,
            lr_scheduler_type="cosine",
            optim="adamw_8bit",
            weight_decay=0.0,
            max_grad_norm=1.0,
            logging_steps=10,
            save_strategy="epoch",
            save_total_limit=2,
            bf16=True,
            output_dir=str(args.output),
            report_to=[],
        ),
    )

    trainer.train()

    # Save merged FP16 weights (ready for GGUF conversion).
    merged_dir = args.output / "merged"
    model.save_pretrained_merged(
        str(merged_dir),
        tokenizer,
        save_method="merged_16bit",
    )
    print(f"[unsloth] merged model written to {merged_dir}")
    print("[unsloth] next: ./training/convert_to_gguf.sh")


def _role(sharegpt_role: str) -> str:
    return {"system": "system", "human": "user", "gpt": "assistant"}[sharegpt_role]


if __name__ == "__main__":
    main()
