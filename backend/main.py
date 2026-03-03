import os
import json
import base64
import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="FreshScan API (Gemini)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

PROMPT = """Analyze this food image and respond ONLY with a raw JSON object:
{"verdict": "fresh" or "okay" or "avoid", "confidence": <integer 60-99>, "emoji": "<food emoji>", "summary": "<2-3 sentence analysis>", "tags": ["tag1", "tag2", "tag3", "tag4"]}"""

@app.get("/")
def health():
    return {"status": "FreshScan API is running"}

@app.post("/analyze")
async def analyze(request: Request):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")

    body = await request.body()
    
    try:
        # Try JSON first
        data = json.loads(body)
        img_data = data.get("image_base64", "")
        media_type = data.get("media_type", "image/jpeg")
        # Make sure it's valid base64
        base64.b64decode(img_data)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request body")

    payload = {
        "contents": [{"parts": [
            {"inline_data": {"mime_type": media_type, "data": img_data}},
            {"text": PROMPT}
        ]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 512},
    }

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            GEMINI_URL,
            params={"key": GEMINI_API_KEY},
            json=payload,
        )

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Gemini error: {response.text}")

    data = response.json()
    try:
        raw = data["candidates"][0]["content"]["parts"][0]["text"]
        raw = raw.strip().replace("```json", "").replace("```", "").strip()
        result = json.loads(raw)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Parse error: {e}")

    return result