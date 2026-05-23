import os
import json
import base64
import binascii
import time
import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel

app = FastAPI(title="FreshScan API")

APP_ENV = os.environ.get("APP_ENV", "development").lower()
IS_PROD = APP_ENV == "production"


def _csv_env(name: str, default: str = "") -> list[str]:
    raw = os.environ.get(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


ALLOWED_ORIGINS = _csv_env("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8080")
ALLOW_ALL_ORIGINS = "*" in ALLOWED_ORIGINS
if IS_PROD and ALLOW_ALL_ORIGINS:
    raise RuntimeError("Refusing to run in production with ALLOWED_ORIGINS=*")

ALLOWED_HOSTS = _csv_env("ALLOWED_HOSTS", "*")
MAX_IMAGE_BYTES = int(os.environ.get("MAX_IMAGE_BYTES", str(5 * 1024 * 1024)))
RATE_LIMIT_WINDOW_SECONDS = int(os.environ.get("RATE_LIMIT_WINDOW_SECONDS", "60"))
RATE_LIMIT_MAX_REQUESTS = int(os.environ.get("RATE_LIMIT_MAX_REQUESTS", "30"))
MAX_SUMMARY_CHARS = int(os.environ.get("MAX_SUMMARY_CHARS", "1200"))
MAX_TAGS = int(os.environ.get("MAX_TAGS", "12"))
MAX_MEDICINES = int(os.environ.get("MAX_MEDICINES", "20"))
MAX_MEDICINE_NAME_CHARS = int(os.environ.get("MAX_MEDICINE_NAME_CHARS", "80"))
ALLOWED_MEDIA_TYPES = {"image/jpeg", "image/png", "image/webp"}


def _get_client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if xff:
        return xff
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


_rate_limit_store: dict[str, list[float]] = {}


def _check_rate_limit(client_ip: str) -> None:
    now = time.time()
    cutoff = now - RATE_LIMIT_WINDOW_SECONDS
    stamps = _rate_limit_store.get(client_ip, [])
    stamps = [ts for ts in stamps if ts >= cutoff]
    if len(stamps) >= RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(status_code=429, detail="Too many requests. Please retry later.")
    stamps.append(now)
    _rate_limit_store[client_ip] = stamps


def _security_headers(response: JSONResponse) -> JSONResponse:
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if IS_PROD:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


def _parse_image_request(body: bytes) -> tuple[str, str]:
    try:
        data = json.loads(body)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid JSON body") from e

    img_data = (data.get("image_base64") or "").strip()
    media_type = (data.get("media_type") or "image/jpeg").strip().lower()

    if media_type not in ALLOWED_MEDIA_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported media_type")
    if not img_data:
        raise HTTPException(status_code=400, detail="image_base64 is required")

    try:
        raw = base64.b64decode(img_data, validate=True)
    except (ValueError, binascii.Error) as e:
        raise HTTPException(status_code=400, detail="Invalid base64 image data") from e

    if len(raw) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image too large")

    return img_data, media_type

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if not ALLOW_ALL_ORIGINS else ["*"],
    allow_methods=["GET", "POST", "HEAD", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

app.add_middleware(TrustedHostMiddleware, allowed_hosts=ALLOWED_HOSTS)

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
    return _security_headers(JSONResponse({"status": "FreshScan API is running"}))


@app.get("/health")
@app.head("/health")
def health():
    return _security_headers(JSONResponse({"status": "ok"}))


@app.post("/analyze")
async def analyze(request: Request):
    _check_rate_limit(_get_client_ip(request))

    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")

    body = await request.body()
    img_data, media_type = _parse_image_request(body)

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
    except Exception:
        raise HTTPException(status_code=502, detail="Upstream request failed")

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Upstream service error")

    data = response.json()
    try:
        raw = data["choices"][0]["message"]["content"]
        raw = raw.strip().replace("```json", "").replace("```", "").strip()
        result = json.loads(raw)
    except Exception:
        raise HTTPException(status_code=502, detail="Invalid upstream response")

    return _security_headers(JSONResponse(result))


class NutritionRequest(BaseModel):
    summary: str
    tags: list[str]


@app.post("/nutrition")
async def nutrition(req: NutritionRequest):
    # Fail fast on oversized user-provided text fields.
    if len(req.summary) > MAX_SUMMARY_CHARS:
        raise HTTPException(status_code=400, detail="summary is too long")
    if len(req.tags) > MAX_TAGS:
        raise HTTPException(status_code=400, detail="too many tags")

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
    except Exception:
        raise HTTPException(status_code=502, detail="Upstream request failed")

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Upstream service error")

    data = response.json()
    try:
        raw = data["choices"][0]["message"]["content"]
        raw = raw.strip().replace("```json", "").replace("```", "").strip()
        result = json.loads(raw)
    except Exception:
        raise HTTPException(status_code=502, detail="Invalid upstream response")

    return _security_headers(JSONResponse(result))


@app.post("/adulteration")
async def adulteration(request: Request):
    _check_rate_limit(_get_client_ip(request))

    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")

    body = await request.body()
    img_data, media_type = _parse_image_request(body)

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
    except Exception:
        raise HTTPException(status_code=502, detail="Upstream request failed")

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Upstream service error")

    data = response.json()
    try:
        raw = data["choices"][0]["message"]["content"]
        raw = raw.strip().replace("```json", "").replace("```", "").strip()
        result = json.loads(raw)
    except Exception:
        raise HTTPException(status_code=502, detail="Invalid upstream response")

    return _security_headers(JSONResponse(result))


@app.post("/medicine")
async def medicine(request: Request):
    _check_rate_limit(_get_client_ip(request))

    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")

    body = await request.body()
    try:
        data = json.loads(body)
        food_summary = (data.get("food_summary") or "").strip()
        food_tags = data.get("food_tags") or []
        medicines = data.get("medicines") or []
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid request body") from e

    if not isinstance(food_tags, list) or not isinstance(medicines, list):
        raise HTTPException(status_code=400, detail="food_tags and medicines must be arrays")
    if len(food_summary) > MAX_SUMMARY_CHARS:
        raise HTTPException(status_code=400, detail="food_summary is too long")
    if len(food_tags) > MAX_TAGS:
        raise HTTPException(status_code=400, detail="too many food_tags")
    if len(medicines) > MAX_MEDICINES:
        raise HTTPException(status_code=400, detail="too many medicines")

    sanitized_medicines = []
    for m in medicines:
        med = str(m).strip()
        if not med:
            continue
        if len(med) > MAX_MEDICINE_NAME_CHARS:
            raise HTTPException(status_code=400, detail="medicine name too long")
        sanitized_medicines.append(med)

    if not sanitized_medicines:
        return _security_headers(JSONResponse({"has_interaction": False, "summary": "No medicines to check.", "interactions": []}))

    prompt = f"""You are a medical food interaction expert.
Food scanned: {food_summary}
Food tags: {', '.join(food_tags)}
Patient's medicines: {', '.join(sanitized_medicines)}

Check if any of these medicines have known interactions with this food.
Respond ONLY with raw JSON, no markdown:
{{"has_interaction": true or false, "summary": "1-2 sentence overall summary", "interactions": [{{"medicine": "medicine name", "warning": "specific warning"}}]}}
Only include medicines that actually have interactions. If none, return empty interactions array."""

    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "max_tokens": 400,
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json=payload,
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request timed out")
    except Exception:
        raise HTTPException(status_code=502, detail="Upstream request failed")

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Upstream service error")

    data = response.json()
    try:
        raw = data["choices"][0]["message"]["content"]
        raw = raw.strip().replace("```json", "").replace("```", "").strip()
        result = json.loads(raw)
    except Exception:
        raise HTTPException(status_code=502, detail="Invalid upstream response")

    return _security_headers(JSONResponse(result))