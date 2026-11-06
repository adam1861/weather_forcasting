import json
import os
import threading
from datetime import datetime
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from tempfile import gettempdir

import pandas as pd
import requests

import weather_model_server


_model_loaded = False
_model_load_lock = threading.Lock()
_model_url = (
    "https://raw.githubusercontent.com/adam1861/weather_forcasting/"
    "334b9f6c95268661ed89a403d880b95979274dfe/models/xgb_model.json"
)


def _prepare_model_file():
    local_model = Path("models/xgb_model.json")
    if local_model.is_file():
        os.environ["WEATHER_XGB_MODEL_PATH"] = str(local_model)
        return

    cached_model = Path(gettempdir()) / "weather-xgb-model.json"
    if not cached_model.is_file() or cached_model.stat().st_size < 1_000_000:
        response = requests.get(_model_url, timeout=(10, 60))
        response.raise_for_status()
        if len(response.content) < 1_000_000:
            raise RuntimeError("Downloaded weather model is incomplete")
        cached_model.write_bytes(response.content)
    os.environ["WEATHER_XGB_MODEL_PATH"] = str(cached_model)


def _send_json(response, status, body):
    payload = json.dumps(body).encode("utf-8")
    response.send_response(status)
    response.send_header("Content-Type", "application/json; charset=utf-8")
    response.send_header("Content-Length", str(len(payload)))
    response.send_header("X-Content-Type-Options", "nosniff")
    response.end_headers()
    response.wfile.write(payload)


def _ensure_model_loaded():
    global _model_loaded
    if _model_loaded:
        return True
    with _model_load_lock:
        if not _model_loaded:
            try:
                _prepare_model_file()
                _model_loaded = weather_model_server.load_model()
            except Exception as error:
                print(f"Unable to prepare the weather model: {error}")
                _model_loaded = False
    return _model_loaded


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        _send_json(self, 200, {"status": "healthy", "model_loaded": _model_loaded})

    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            if content_length <= 0 or content_length > 16_384:
                return _send_json(self, 400, {"error": "Invalid request body"})

            data = json.loads(self.rfile.read(content_length))
            if not isinstance(data, dict) or not all(
                key in data for key in ("date", "latitude", "longitude")
            ):
                return _send_json(
                    self,
                    400,
                    {"error": "Missing required fields: date, latitude, longitude"},
                )

            latitude = float(data["latitude"])
            longitude = float(data["longitude"])
            if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
                return _send_json(
                    self,
                    400,
                    {"error": "Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180"},
                )

            forecast_date = pd.to_datetime(data["date"], errors="raise")
            if pd.isna(forecast_date):
                return _send_json(self, 400, {"error": "Invalid date format"})
            now = datetime.now(forecast_date.tzinfo)
            if (forecast_date.to_pydatetime() - now).total_seconds() > 7 * 24 * 60 * 60:
                return _send_json(
                    self, 400, {"error": "Cannot predict weather more than 7 days ahead"}
                )

            if not _ensure_model_loaded():
                return _send_json(self, 503, {"error": "Weather model is unavailable"})

            weather_data = weather_model_server.predict_weather(
                str(data["date"]), latitude, longitude
            )
            if weather_data is None:
                return _send_json(self, 500, {"error": "Failed to generate weather prediction"})

            return _send_json(self, 200, {"success": True, "data": weather_data})
        except (TypeError, ValueError, json.JSONDecodeError) as error:
            return _send_json(self, 400, {"error": f"Invalid input: {error}"})
        except Exception as error:
            return _send_json(self, 500, {"error": f"Server error: {error}"})
