"""
AgriEasy Bill OCR — Donut Fine-Tuning (Google Colab Notebook)
==============================================================

This file is a Python script that can be run in Google Colab.
It fine-tunes the Donut model on your labeled bill images.

INSTRUCTIONS:
1. Upload your `donut_data/` folder to Google Drive (or upload directly to Colab)
2. Open Google Colab → New Notebook
3. Paste this entire script into a cell
4. Set GPU: Runtime → Change runtime type → T4 GPU
5. Run all cells

EXPECTED TIME:
- 5K images: ~2-3 hours on T4 GPU
- 50K images: ~8-12 hours on T4 GPU (use Colab Pro for V100/A100)
- 100K images: ~15-20 hours on T4 GPU (use Colab Pro)

COST:
- Google Colab Free: T4 GPU, 12 hours max runtime, may disconnect
- Google Colab Pro (~₹1,000/month): V100/A100 GPU, 24h runtime
- Kaggle: Free P100 GPU, 30 hours/week
"""

# ═══════════════════════════════════════════════════════════════════════
# STEP 1: Install dependencies
# ═══════════════════════════════════════════════════════════════════════
# Run this in a Colab cell:
#
# !pip install -q transformers datasets torch accelerate Pillow

# ═══════════════════════════════════════════════════════════════════════
# STEP 2: Configuration — EDIT THESE
# ═══════════════════════════════════════════════════════════════════════

# Path to your prepared data (upload donut_data/ to Colab or Google Drive)
DATA_DIR = "/content/donut_data"  # or "/content/drive/MyDrive/donut_data"

# Hugging Face Hub credentials (to save the trained model)
HF_USERNAME = "rishabh01487"  # your HF username
HF_MODEL_NAME = "agrieasy-bill-ocr"  # model name on HF Hub
HF_TOKEN = "hf_your_token_here"  # get from https://huggingface.co/settings/tokens

# Training hyperparameters
EPOCHS = 10
BATCH_SIZE = 4  # reduce to 2 if OOM on T4
LEARNING_RATE = 2e-5
IMAGE_SIZE = (960, 1280)  # Donut default — adjust if images are smaller
MAX_LENGTH = 768

# ═══════════════════════════════════════════════════════════════════════
# STEP 3: Load and prepare the dataset
# ═══════════════════════════════════════════════════════════════════════

import os
import json
from datasets import load_dataset, Dataset
from PIL import Image

# Load the dataset from the prepared directory
dataset = load_dataset("imagefolder", data_dir=DATA_DIR)
print(f"Train: {len(dataset['train'])} | Val: {len(dataset['val'])}")

# ═══════════════════════════════════════════════════════════════════════
# STEP 4: Load Donut model and processor
# ═══════════════════════════════════════════════════════════════════════

import torch
from transformers import (
    DonutProcessor,
    VisionEncoderDecoderModel,
    VisionEncoderDecoderConfig,
    Trainer,
    TrainingArguments,
)

# Load pre-trained Donut (base model — we'll fine-tune it)
processor = DonutProcessor.from_pretrained("naver-clova-ocr/donut-base")
model = VisionEncoderDecoderModel.from_pretrained("naver-clova-ocr/donut-base")

# Configure the model
config = model.config
config.decoder.max_length = MAX_LENGTH

# Special tokens for JSON parsing
processor.tokenizer.add_special_tokens({
    "additional_special_tokens": ["<s>", "</s>", "<s_total>", "</s_total>",
                                   "<s_commodities>", "</s_commodities>",
                                   "<s_name>", "</s_name>",
                                   "<s_batches>", "</s_batches>",
                                   "<s_bagCount>", "</s_bagCount>",
                                   "<s_weight>", "</s_weight>"]
})

model.decoder.resize_token_embeddings(len(processor.tokenizer))

# Task prompt — Donut uses this to know what task to perform
TASK_PROMPT = "<s_agrieasy_bill>"

# ═══════════════════════════════════════════════════════════════════════
# STEP 5: Create the data collator and preprocessing
# ═══════════════════════════════════════════════════════════════════════

def preprocess_dataset(example):
    """Convert a dataset example to Donut input format."""
    image = example["image"]
    if not isinstance(image, Image.Image):
        image = Image.open(image).convert("RGB")
    
    # Process image → pixel values
    pixel_values = processor(image, return_tensors="pt").pixel_values
    
    # Process ground truth → input IDs
    ground_truth = example["ground_truth"]
    # Prepend task prompt
    full_text = TASK_PROMPT + ground_truth + processor.tokenizer.eos_token
    input_ids = processor.tokenizer(
        full_text,
        add_special_tokens=False,
        max_length=MAX_LENGTH,
        padding="max_length",
        truncation=True,
        return_tensors="pt",
    ).input_ids
    
    return {
        "pixel_values": pixel_values.squeeze(),
        "labels": input_ids.squeeze(),
    }

# Apply preprocessing
print("Preprocessing training data...")
train_dataset = dataset["train"].map(
    preprocess_dataset,
    remove_columns=dataset["train"].column_names,
    num_proc=4,
)
print("Preprocessing validation data...")
val_dataset = dataset["val"].map(
    preprocess_dataset,
    remove_columns=dataset["val"].column_names,
    num_proc=4,
)

print(f"Train: {len(train_dataset)} | Val: {len(val_dataset)}")

# ═══════════════════════════════════════════════════════════════════════
# STEP 6: Training
# ═══════════════════════════════════════════════════════════════════════

training_args = TrainingArguments(
    output_dir="./donut-agrieasy",
    num_train_epochs=EPOCHS,
    per_device_train_batch_size=BATCH_SIZE,
    per_device_eval_batch_size=BATCH_SIZE,
    learning_rate=LEARNING_RATE,
    warmup_ratio=0.05,
    weight_decay=0.01,
    logging_steps=50,
    eval_strategy="steps",
    eval_steps=500,
    save_strategy="steps",
    save_steps=1000,
    save_total_limit=3,
    load_best_model_at_end=True,
    metric_for_best_model="eval_loss",
    greater_is_better=False,
    report_to="tensorboard",
    fp16=True,  # mixed precision for faster training on GPU
    dataloader_num_workers=4,
    remove_unused_columns=False,
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
)

print("Starting training...")
print(f"  Epochs: {EPOCHS}")
print(f"  Batch size: {BATCH_SIZE}")
print(f"  Learning rate: {LEARNING_RATE}")
print(f"  Train samples: {len(train_dataset)}")
print(f"  Val samples: {len(val_dataset)}")
print()

trainer.train()

# ═══════════════════════════════════════════════════════════════════════
# STEP 7: Test the model on a sample image
# ═══════════════════════════════════════════════════════════════════════

def test_inference(image_path):
    """Run inference on a single image."""
    image = Image.open(image_path).convert("RGB")
    pixel_values = processor(image, return_tensors="pt").pixel_values
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model.to(device)
    pixel_values = pixel_values.to(device)
    
    # Generate
    task_prompt = TASK_PROMPT
    decoder_input_ids = processor.tokenizer(
        task_prompt, add_special_tokens=False, return_tensors="pt"
    ).input_ids.to(device)
    
    outputs = model.generate(
        pixel_values,
        decoder_input_ids=decoder_input_ids,
        max_length=MAX_LENGTH,
        early_stopping=True,
        pad_token_id=processor.tokenizer.pad_token_id,
        eos_token_id=processor.tokenizer.eos_token_id,
        use_cache=True,
        num_beams=1,
        bad_words_ids=[[processor.tokenizer.unk_token_id]],
        return_dict_in_generate=True,
    )
    
    # Decode
    sequence = processor.batch_decode(outputs.sequences)[0]
    # Remove task prompt and special tokens
    sequence = sequence.replace(TASK_PROMPT, "").replace("</s>", "").strip()
    
    return sequence

# Test on a validation image
import random
val_samples = list(dataset["val"])
if val_samples:
    sample = random.choice(val_samples)
    print("Testing on sample image...")
    result = test_inference(sample["image_path"] if "image_path" in sample else sample["image"])
    print(f"Ground truth: {sample['ground_truth']}")
    print(f"Predicted:    {result}")

# ═══════════════════════════════════════════════════════════════════════
# STEP 8: Save model to Hugging Face Hub
# ═══════════════════════════════════════════════════════════════════════

print("\nSaving model to Hugging Face Hub...")

# Save locally first
trainer.save_model("./donut-agrieasy-final")
processor.save_pretrained("./donut-agrieasy-final")

# Push to Hub
model.push_to_hub(f"{HF_USERNAME}/{HF_MODEL_NAME}", token=HF_TOKEN)
processor.push_to_hub(f"{HF_USERNAME}/{HF_MODEL_NAME}", token=HF_TOKEN)

print(f"\n✅ Model saved to: https://huggingface.co/{HF_USERNAME}/{HF_MODEL_NAME}")
print(f"\nNext step: Deploy the inference API (ml-inference/) to Hugging Face Spaces")
