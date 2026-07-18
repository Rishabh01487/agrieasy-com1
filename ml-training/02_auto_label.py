"""
AgriEasy Bill OCR — Auto-Labeling Script
=========================================
Uses GPT-4o-mini (via OpenRouter) to automatically label bill images.

Usage:
    python 02_auto_label.py --images-dir /path/to/bills --output labels.jsonl

This script:
1. Reads all bill images from a directory
2. Sends each to GPT-4o-mini with the OCR prompt
3. Saves the results as JSONL (one JSON object per line)
4. Supports parallel processing (10 images at a time)
5. Resumable — skips already-labeled images

The output JSONL file can then be used by 03_train_donut.ipynb for training.
"""

import os
import sys
import json
import base64
import time
import argparse
import concurrent.futures
from pathlib import Path
from typing import Optional

import requests

# ── Config ──────────────────────────────────────────────────────────────
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = "openai/gpt-4o-mini"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Rate limiting: OpenRouter free tier = 20 req/min
# With paid GPT-4o-mini: much higher. We use 10 concurrent workers.
MAX_WORKERS = 5  # parallel requests
RETRY_ATTEMPTS = 3
RETRY_DELAY = 5  # seconds

# ── OCR Prompt (same as the app uses) ───────────────────────────────────
OCR_PROMPT = """You are an OCR engine for Indian grain-market bills (परची / बही).

The uploaded image is a photo of a handwritten bill from a grain merchant.

CRITICAL — HOW INDIAN GRAIN BILLS WORK:
The buyer weighs bags in BATCHES of ~10. Each number written is the COMBINED weight
of those bags (e.g. "551" = 551 kg for 10 bags, NOT 5510 kg).

YOUR JOB:
1. Identify each commodity on the bill.
2. For each commodity, extract every BATCH row as {bagCount, weight}.
3. Read numbers EXACTLY as written — do NOT add extra zeros.
4. Each commodity has its OWN list of weights — do NOT copy between commodities.
5. Convert Devanagari digits to modern decimal numerals.

Return ONLY valid JSON:
{
  "commodities": [
    {
      "name": "Wheat",
      "batches": [{"bagCount": 10, "weight": 551}],
      "totalBags": 100,
      "totalWeight": 5540
    }
  ],
  "grandTotalBags": 100,
  "grandTotalWeight": 5540,
  "rawText": "Brief description"
}"""


def encode_image(image_path: str) -> tuple[str, str]:
    """Read and base64-encode an image file. Returns (base64, mime_type)."""
    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")

    ext = Path(image_path).suffix.lower()
    mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
                ".webp": "image/webp", ".bmp": "image/bmp"}
    mime = mime_map.get(ext, "image/jpeg")
    return b64, mime


def call_ocr(image_path: str) -> Optional[dict]:
    """Send an image to GPT-4o-mini and get the OCR result."""
    b64, mime = encode_image(image_path)

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": OCR_PROMPT},
                {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
            ],
        }],
        "temperature": 0.1,
        "max_tokens": 2000,
    }

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://agrieasy-com1.vercel.app",
        "X-Title": "AgriEasy Auto-Labeler",
    }

    for attempt in range(RETRY_ATTEMPTS):
        try:
            res = requests.post(OPENROUTER_URL, json=payload, headers=headers, timeout=60)
            if res.status_code == 429:
                print(f"  Rate limited, waiting {RETRY_DELAY}s...")
                time.sleep(RETRY_DELAY)
                continue
            if res.status_code != 200:
                print(f"  API error {res.status_code}: {res.text[:200]}")
                time.sleep(RETRY_DELAY)
                continue

            data = res.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

            # Parse JSON from response
            try:
                result = json.loads(content)
            except json.JSONDecodeError:
                # Try to extract JSON from text
                import re
                match = re.search(r'\{[\s\S]*\}', content)
                if match:
                    result = json.loads(match.group())
                else:
                    print(f"  Could not parse JSON from response")
                    return None

            return result

        except requests.exceptions.Timeout:
            print(f"  Timeout on attempt {attempt+1}")
            time.sleep(RETRY_DELAY)
        except Exception as e:
            print(f"  Error: {e}")
            time.sleep(RETRY_DELAY)

    return None


def process_image(image_path: str) -> dict:
    """Process a single image and return a label record."""
    filename = os.path.basename(image_path)
    result = call_ocr(image_path)

    if result is None:
        return {
            "image_path": image_path,
            "image_filename": filename,
            "status": "failed",
            "label": None,
            "error": "OCR failed after retries",
        }

    return {
        "image_path": image_path,
        "image_filename": filename,
        "status": "labeled",
        "label": result,
        "error": None,
    }


def load_existing_labels(output_file: str) -> set:
    """Load already-labeled image filenames for resumability."""
    done = set()
    if os.path.exists(output_file):
        with open(output_file, "r") as f:
            for line in f:
                try:
                    record = json.loads(line.strip())
                    if record.get("status") == "labeled":
                        done.add(record.get("image_filename"))
                except:
                    pass
    return done


def main():
    parser = argparse.ArgumentParser(description="Auto-label bill images using GPT-4o-mini")
    parser.add_argument("--images-dir", required=True, help="Directory containing bill images")
    parser.add_argument("--output", default="labels.jsonl", help="Output JSONL file")
    parser.add_argument("--workers", type=int, default=MAX_WORKERS, help="Parallel workers")
    args = parser.parse_args()

    if not OPENROUTER_API_KEY:
        print("ERROR: Set OPENROUTER_API_KEY environment variable")
        print("  export OPENROUTER_API_KEY='sk-or-v1-...'")
        sys.exit(1)

    # Find all images
    valid_exts = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    images = []
    for root, dirs, files in os.walk(args.images_dir):
        for f in files:
            if Path(f).suffix.lower() in valid_exts:
                images.append(os.path.join(root, f))

    print(f"Found {len(images)} images in {args.images_dir}")

    # Load already-labeled images
    done = load_existing_labels(args.output)
    if done:
        print(f"Resuming: {len(done)} images already labeled")

    # Filter to only unlabeled
    to_label = [img for img in images if os.path.basename(img) not in done]
    print(f"To label: {len(to_label)} images")
    print(f"Workers: {args.workers}")
    print()

    if not to_label:
        print("All images already labeled!")
        return

    # Open output file in append mode
    with open(args.output, "a") as out_f:
        total = len(to_label)
        completed = 0
        failed = 0

        with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
            futures = {executor.submit(process_image, img): img for img in to_label}

            for future in concurrent.futures.as_completed(futures):
                img = futures[future]
                try:
                    result = future.result()
                    out_f.write(json.dumps(result) + "\n")
                    out_f.flush()

                    completed += 1
                    if result["status"] == "labeled":
                        status = "✓"
                    else:
                        status = "✗"
                        failed += 1

                    if completed % 50 == 0 or completed == total:
                        pct = (completed / total) * 100
                        print(f"  [{completed}/{total}] {pct:.1f}% | ✓ {completed - failed} labeled | ✗ {failed} failed | {os.path.basename(img)}")

                except Exception as e:
                    print(f"  ERROR processing {img}: {e}")
                    failed += 1

    print(f"\nDone! {completed - failed} labeled, {failed} failed")
    print(f"Output: {args.output}")
    print(f"\nNext step: Run 03_train_donut.ipynb in Google Colab to train the model")


if __name__ == "__main__":
    main()
