from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow requests from your mobile app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "FreshScan backend running"}

@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    # Temporary test response
    return {
        "fruit": "apple",
        "freshness": "fresh",
        "confidence": 0.95
    }