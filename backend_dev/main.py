from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

from routes.auth import router as auth_router
from routes.trees import router as trees_router
from routes.profile_assets import router as profile_assets_router

# Load .env from backend_dev folder so it works no matter where you run the server from
_env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(_env_path)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting Family Tree Backend...")
    yield
    # Shutdown
    print("Shutting down Family Tree Backend...")

app = FastAPI(title="Family Tree API", lifespan=lifespan)

# CORS configuration
origins = [
    os.getenv("FRONTEND_URL", "http://localhost:5173"),
    "http://localhost:3000",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers (profile-assets on separate path to avoid conflict with /api/trees/{id})
app.include_router(auth_router, prefix="/api/auth")
app.include_router(profile_assets_router, prefix="/api/profile-assets")
app.include_router(trees_router, prefix="/api/trees")

@app.get("/health")
def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("API_PORT", 5000))
    uvicorn.run(app, host="0.0.0.0", port=port)
