"""FastAPI entry point for local execution and Render deployment."""

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from simulator import Scenario, compare_scenarios


ROOT = Path(__file__).resolve().parent
FRONTEND = ROOT / "dist"
app = FastAPI(title="Simulador de flotación: control de nivel", version="1.0.0")
app.mount("/assets", StaticFiles(directory=FRONTEND / "assets"), name="assets")


class SimulationRequest(BaseModel):
    duration_s: int = Field(default=900, ge=120, le=900)
    feed_lpm: float = Field(default=45.0, ge=20, le=60)
    feed_step_lpm: float = Field(default=8.0, ge=-15, le=15)
    feed_step_s: int = Field(default=180, ge=0)
    setpoints_after_cm: tuple[float, float, float] = (28.5, 32.5, 32.0)
    setpoint_step_s: int = Field(default=450, ge=0)


@app.get("/", include_in_schema=False)
def home() -> FileResponse:
    return FileResponse(FRONTEND / "index.html")


@app.get("/favicon.svg", include_in_schema=False)
def favicon() -> FileResponse:
    return FileResponse(FRONTEND / "favicon.svg", media_type="image/svg+xml")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/simulate")
def simulate(request: SimulationRequest) -> dict:
    try:
        scenario = Scenario(**request.model_dump())
        return compare_scenarios(scenario)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


if __name__ == "__main__":
    import os
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("PORT", "8000")))
