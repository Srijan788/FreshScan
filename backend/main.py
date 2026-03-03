import os
import json
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="FreshScan API (Gemini)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_MODEL   = "gemini-2.5-flash"
GEMINI_URL     = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

PROMPT = """You are a food freshness and quality expert AI. Analyze this food image and respond ONLY with a raw JSON object with this exact shape:
{"verdict": "fresh" | "okay" | "avoid", "confidence": <integer 60-99>, "emoji": "<single emoji>", "summary": "<2-3 sentence analysis>", "tags": ["<tag1>", "<tag2>", "<tag3>", "<tag4>"]}"""

class AnalyzeRequest(BaseModel):
    image_base64: str
    media_type: str = "image/jpeg"

@app.get("/")
def health():
    return {"status": "FreshScan API is running 🥦"}

@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
    payload = {
        "contents": [{"parts": [{"inline_data": {"mime_type": req.media_type, "data": req.image_base64}}, {"text": PROMPT}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 512},
    }
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(GEMINI_URL, params={"key": GEMINI_API_KEY}, json=payload)
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {response.text}")
    data = response.json()
    try:
        raw = data["candidates"][0]["content"]["parts"][0]["text"]
        raw = raw.strip().replace("```json", "").replace("```", "").strip()
        result = json.loads(raw)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Parse error: {e}")
    return result