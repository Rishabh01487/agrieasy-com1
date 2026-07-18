"""
AgriEasy Bill OCR — Inference API (FastAPI)
============================================

This server loads the fine-tuned Donut model and serves OCR predictions.

Deploy on Hugging Face Spaces (free Docker CPU tier):
1. Create a new Space at https://huggingface.co/new-space
2. Type: Docker
3. Upload this file + Dockerfile + requirements.txt
4. Set environment variable: MODEL_NAME=rishabh01487/agrieasy-bill-ocr
5. Deploy — it's live at https://<your-name>-agrieasy-bill-ocr.hf.space

API:
  POST /ocr
    Body: multipart form with "file" (image)
    Response: {"commodities": [...], "grandTotalBags": ..., "grandTotalWeight": ...}

  GET /health
    Response: {"status": "ok", "model": "..."}
"""

import os
import io
import json
import re
from typing import Optional

import torch
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import DonutProcessor, VisionEncoderDecoderModel

# ── Config ──────────────────────────────────────────────────────────
MODEL_NAME = os.environ.get("MODEL_NAME", "rishabh01487/agrieasy-bill-ocr")
TASK_PROMPT = "<s_agrieasy_bill>"
MAX_LENGTH = 768
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# ── Load model ──────────────────────────────────────────────────────
print(f"Loading model: {MODEL_NAME} on {DEVICE}...")
processor = DonutProcessor.from_pretrained(MODEL_NAME)
model = VisionEncoderDecoderModel.from_pretrained(MODEL_NAME)
model.to(DEVICE)
model.eval()
print("Model loaded!")

# ── FastAPI app ─────────────────────────────────────────────────────
app = FastAPI(title="AgriEasy Bill OCR", version="1.0.0")

# CORS — allow requests from the AgriEasy app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)


class OCRResult(BaseModel):
    commodities: list
    grandTotalBags: int
    grandTotalWeight: float
    rawText: str


@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL_NAME, "device": DEVICE}


@app.post("/ocr", response_model=OCRResult)
async def run_ocr(file: UploadFile = File(...)):
    """Run OCR on a bill image and return structured JSON."""
    # Read image
    image_data = await file.read()
    if not image_data:
        raise HTTPException(status_code=400, detail="No image provided")

    try:
        image = Image.open(io.BytesIO(image_data)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    # Preprocess
    pixel_values = processor(image, return_tensors="pt").pixel_values.to(DEVICE)

    # Generate
    decoder_input_ids = processor.tokenizer(
        TASK_PROMPT, add_special_tokens=False, return_tensors="pt"
    ).input_ids.to(DEVICE)

    with torch.no_grad():
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
    sequence = sequence.replace(TASK_PROMPT, "").replace("</s>", "").strip()

    # Parse JSON from the sequence
    try:
        # Try direct parse
        result = json.loads(sequence)
    except json.JSONDecodeError:
        # Try to extract JSON from text
        match = re.search(r'\{[\s\S]*\}', sequence)
        if match:
            try:
                result = json.loads(match.group())
            except json.JSONDecodeError:
                raise HTTPException(status_code=422, detail="Could not parse model output as JSON")
        else:
            raise HTTPException(status_code=422, detail="Model output contains no JSON")

    # Normalize the output
    commodities = result.get("commodities", [])
    grand_total_bags = result.get("grandTotalBags", sum(c.get("totalBags", 0) for c in commodities))
    grand_total_weight = result.get("grandTotalWeight", sum(c.get("totalWeight", 0) for c in commodities))

    return OCRResult(
        commodities=commodities,
        grandTotalBags=grand_total_bags,
        grandTotalWeight=float(grand_total_weight),
        rawText=f"Model: {MODEL_NAME} | Commodities: {len(commodities)} | Bags: {grand_total_bags} | Weight: {grand_total_weight}kg",
    )


@app.get("/")
async def root():
    return {
        "service": "AgriEasy Bill OCR",
        "model": MODEL_NAME,
        "endpoints": {
            "POST /ocr": "Upload a bill image, get structured JSON",
            "GET /health": "Health check",
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
