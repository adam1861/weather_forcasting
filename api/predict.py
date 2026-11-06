import json
from datetime import date, datetime, timedelta
from http.server import BaseHTTPRequestHandler

from weather_forecast import forecast_for_location


def _send_json(response, status, body):
    payload = json.dumps(body).encode("utf-8")
    response.send_response(status)
    response.send_header("Content-Type", "application/json; charset=utf-8")
    response.send_header("Content-Length", str(len(payload)))
    response.send_header("X-Content-Type-Options", "nosniff")
    response.end_headers()
    response.wfile.write(payload)


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        _send_json(self, 200, {"status": "healthy", "forecast_source": "Open-Meteo"})

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

            forecast_day = datetime.strptime(str(data["date"])[:10], "%Y-%m-%d").date()
            today = date.today()
            if forecast_day < today - timedelta(days=1):
                return _send_json(self, 400, {"error": "Cannot forecast weather for past dates"})
            if forecast_day > today + timedelta(days=8):
                return _send_json(
                    self, 400, {"error": "Cannot forecast weather more than 7 days ahead"}
                )

            weather_data = forecast_for_location(
                forecast_day.isoformat(), latitude, longitude
            )
            return _send_json(self, 200, {"success": True, "data": weather_data})
        except (TypeError, ValueError, json.JSONDecodeError) as error:
            return _send_json(self, 400, {"error": f"Invalid input: {error}"})
        except Exception as error:
            print(f"Weather forecast request failed: {error}")
            return _send_json(
                self,
                502,
                {"error": "Weather data is temporarily unavailable. Please try again shortly."},
            )
