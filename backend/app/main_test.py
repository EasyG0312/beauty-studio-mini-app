from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Beauty Studio API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "message": "Beauty Studio API is running"}


@app.get("/api/health")
def health():
    return {"status": "healthy"}


@app.get("/api/analytics/summary")
def analytics_summary():
    return {
        "total_clients": 0,
        "loyal_clients": 0,
        "today_bookings": 0,
        "week_bookings": 0,
        "total_bookings": 0,
        "revenue_7d": 0,
        "revenue_30d": 0,
        "avg_rating": 0,
        "confirmed": 0,
        "cancelled": 0,
        "no_show": 0,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=10000)
