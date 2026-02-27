from fastapi import FastAPI
from fastapi.responses import FileResponse

app = FastAPI()

@app.get("/")
def root():
    return {"status": "FreshScan backend running"}

@app.get("/favicon.ico")
def favicon():
    return FileResponse("favicon.ico")