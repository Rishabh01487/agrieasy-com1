"""
AgriEasy Bill OCR — Data Preparation
=====================================
Converts auto-labeled images into Donut training format.

Donut expects data in this format:
  {
    "image": <PIL Image or path>,
    "ground_truth": "<s>{...JSON...}</s>"  (with special tokens)
  }

Usage:
    python 01_prepare_data.py --labels labels.jsonl --images-dir /path/to/bills --output-dir donut_data

This creates:
  donut_data/
  ├── train/
  │   ├── metadata.jsonl  (one line per image: {"file_name": ..., "ground_truth": ...})
  │   ├── image_001.jpg
  │   ├── image_002.jpg
  │   └── ...
  └── val/
      ├── metadata.jsonl
      └── ...
"""

import os
import json
import shutil
import argparse
import random
from pathlib import Path


def normalize_label(label: dict) -> str:
    """Convert the OCR result to Donut's expected JSON format.
    
    Donut expects a flat JSON with a 'gt_parse' key containing the structured data.
    The text is wrapped in <s>...</s> special tokens.
    """
    # Build the structured output Donut should learn to produce
    structured = {
        "commodities": label.get("commodities", []),
        "grandTotalBags": label.get("grandTotalBags", 0),
        "grandTotalWeight": label.get("grandTotalWeight", 0),
    }
    
    # Donut format: <s>{"gt_parse": {...}}</s>
    return f'<s>{json.dumps(structured)}</s>'


def main():
    parser = argparse.ArgumentParser(description="Prepare data for Donut training")
    parser.add_argument("--labels", required=True, help="Path to labels.jsonl from auto-labeling")
    parser.add_argument("--images-dir", required=True, help="Directory containing bill images")
    parser.add_argument("--output-dir", default="donut_data", help="Output directory")
    parser.add_argument("--val-split", type=float, default=0.1, help="Validation split (0.1 = 10%)")
    parser.add_argument("--min-quality", action="store_true", help="Only include images with 2+ commodities")
    args = parser.parse_args()

    # Read all labels
    records = []
    with open(args.labels, "r") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
                if record.get("status") != "labeled":
                    continue
                if not record.get("label"):
                    continue
                
                label = record["label"]
                
                # Quality filter: skip if no commodities or empty batches
                commodities = label.get("commodities", [])
                if not commodities:
                    continue
                
                has_batches = any(c.get("batches") for c in commodities)
                if not has_batches:
                    continue
                
                if args.min_quality and len(commodities) < 2:
                    continue
                
                # Find the image file
                img_filename = record["image_filename"]
                img_path = record.get("image_path", os.path.join(args.images_dir, img_filename))
                
                if not os.path.exists(img_path):
                    # Try in images-dir
                    img_path = os.path.join(args.images_dir, img_filename)
                    if not os.path.exists(img_path):
                        continue
                
                records.append({
                    "image_path": img_path,
                    "image_filename": img_filename,
                    "ground_truth": normalize_label(label),
                })
            except Exception as e:
                continue

    print(f"Valid records: {len(records)}")

    if len(records) == 0:
        print("No valid records found!")
        return

    # Shuffle and split
    random.seed(42)
    random.shuffle(records)
    val_count = int(len(records) * args.val_split)
    val_records = records[:val_count]
    train_records = records[val_count:]

    print(f"Train: {len(train_records)} | Val: {len(val_records)}")

    # Create output directories
    train_dir = os.path.join(args.output_dir, "train")
    val_dir = os.path.join(args.output_dir, "val")
    os.makedirs(train_dir, exist_ok=True)
    os.makedirs(val_dir, exist_ok=True)

    # Copy images and write metadata
    for split_name, split_records, split_dir in [
        ("train", train_records, train_dir),
        ("val", val_records, val_dir),
    ]:
        metadata_path = os.path.join(split_dir, "metadata.jsonl")
        with open(metadata_path, "w") as meta_f:
            for i, record in enumerate(split_records):
                # Copy image with a clean sequential name
                ext = Path(record["image_filename"]).suffix.lower()
                new_name = f"image_{i:06d}{ext}"
                dst_path = os.path.join(split_dir, new_name)
                
                # Copy if not already there
                if not os.path.exists(dst_path):
                    shutil.copy2(record["image_path"], dst_path)
                
                # Write metadata
                meta = {
                    "file_name": new_name,
                    "ground_truth": record["ground_truth"],
                }
                meta_f.write(json.dumps(meta) + "\n")

        print(f"  {split_name}: {len(split_records)} images + metadata.jsonl")

    print(f"\nDone! Data prepared at: {args.output_dir}/")
    print(f"Next step: Upload to Google Colab and run 03_train_donut.ipynb")


if __name__ == "__main__":
    main()
