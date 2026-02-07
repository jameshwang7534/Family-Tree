from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

from routes.auth import router as auth_router
from routes.trees import router as trees_router

# Load environment variables
load_dotenv()

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

# Include routers
app.include_router(auth_router, prefix="/api/auth")
app.include_router(trees_router, prefix="/api/trees")

@app.get("/health")
def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("API_PORT", 5000))
    uvicorn.run(app, host="0.0.0.0", port=port)
