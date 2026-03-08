import os
import json
import base64
import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="FreshScan API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

ANALYZE_PROMPT = """You are a food freshness expert. Analyze this food image carefully.
Respond ONLY with a raw JSON object, no markdown, no extra text:
{"verdict": "fresh" or "okay" or "avoid", "confidence": <integer 60-99>, "emoji": "<food emoji>", "summary": "<2-3 sentence analysis of freshness>", "tags": ["tag1", "tag2", "tag3", "tag4"]}"""

NUTRITION_PROMPT = """Based on this food analysis: "{summary}". Food tags: {tags}.
Respond ONLY with a raw JSON object (no markdown, no extra text):
{{"food_name": "<specific food name>", "calories": <integer>, "protein": <float>, "carbs": <float>, "fat": <float>, "fiber": <float>, "highlights": ["<vitamin/mineral 1>", "<vitamin/mineral 2>", "<vitamin/mineral 3>"]}}
Provide realistic nutrition estimates per 100g serving."""

ADULTERATION_PROMPT = """Analyze this food image for adulteration. Respond ONLY with a raw JSON object, no markdown, no extra text:
{"status": "safe", "risk_level": "LOW", "food_type": "<name of food detected>", "summary": "<2-3 sentence analysis>", "adulterants": ["<possible adulterant 1>", "<possible adulterant 2>"], "home_tests": ["<simple home test 1>", "<simple home test 2>"]}
status must be exactly one of: safe, suspect, adulterated
risk_level must be exactly one of: LOW, MEDIUM, HIGH
adulterants should be empty array [] if status is safe
home_tests should always have 2 simple tests the user can do at home"""


@app.get("/")
@app.head("/")
def root():
    return {"status": "FreshScan API is running"}


@app.get("/health")
@app.head("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(request: Request):
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")

    body = await request.body()

    try:
        data = json.loads(body)
        img_data = data.get("image_base64", "")
        media_type = data.get("media_type", "image/jpeg")
        base64.b64decode(img_data)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request body")

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{media_type};base64,{img_data}"
                        }
                    },
                    {
                        "type": "text",
                        "text": ANALYZE_PROMPT
                    }
                ]
            }
        ],
        "temperature": 0.2,
        "max_tokens": 512,
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                GROQ_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request timed out")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Request failed: {str(e)}")

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Groq error: {response.text}")

    data = response.json()
    try:
        raw = data["choices"][0]["message"]["content"]
        raw = raw.strip().replace("```json", "").replace("```", "").strip()
        result = json.loads(raw)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Parse error: {e}")

    return result


class NutritionRequest(BaseModel):
    summary: str
    tags: list[str]


@app.post("/nutrition")
async def nutrition(req: NutritionRequest):
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")

    prompt = NUTRITION_PROMPT.format(
        summary=req.summary,
        tags=", ".join(req.tags)
    )

    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1,
        "max_tokens": 300,
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                GROQ_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Nutrition request timed out")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Request failed: {str(e)}")

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Groq error: {response.text}")

    data = response.json()
    try:
        raw = data["choices"][0]["message"]["content"]
        raw = raw.strip().replace("```json", "").replace("```", "").strip()
        result = json.loads(raw)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Parse error: {e}")

    return result


@app.post("/adulteration")
async def adulteration(request: Request):
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")

    body = await request.body()

    try:
        data = json.loads(body)
        img_data = data.get("image_base64", "")
        media_type = data.get("media_type", "image/jpeg")
        base64.b64decode(img_data)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request body")

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{media_type};base64,{img_data}"
                        }
                    },
                    {
                        "type": "text",
                        "text": ADULTERATION_PROMPT
                    }
                ]
            }
        ],
        "temperature": 0.2,
        "max_tokens": 500,
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                GROQ_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request timed out")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Request failed: {str(e)}")

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Groq error: {response.text}")

    data = response.json()
    try:
        raw = data["choices"][0]["message"]["content"]
        raw = raw.strip().replace("```json", "").replace("```", "").strip()
        result = json.loads(raw)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Parse error: {e}")

    return result
