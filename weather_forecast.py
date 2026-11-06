"""Location-aware hourly forecasts from the Open-Meteo Forecast API."""

from datetime import date

import requests


API_URL = "https://api.open-meteo.com/v1/forecast"
HOURLY_FIELDS = ",".join(
    (
        "temperature_2m",
        "apparent_temperature",
        "relative_humidity_2m",
        "precipitation_probability",
        "rain",
        "weather_code",
        "wind_speed_10m",
        "wind_gusts_10m",
        "pressure_msl",
        "visibility",
    )
)

SNOW_CODES = {71, 73, 75, 77, 85, 86}
FREEZING_CODES = {56, 57, 66, 67}
RAIN_CODES = {51, 53, 55, 61, 63, 65, 80, 81, 82}
STORM_CODES = {95, 96, 99}


def _value(hourly, field, index, default=0):
    values = hourly.get(field) or []
    value = values[index] if index < len(values) else None
    return default if value is None else value


def _primary_condition(code, temperature):
    if code in SNOW_CODES:
        return "Snow"
    if code in FREEZING_CODES:
        return "Freezing"
    if code in RAIN_CODES or code in STORM_CODES:
        return "Rain"
    if code == 0:
        if temperature >= 30:
            return "Hot"
        if temperature >= 24:
            return "Warm"
        if temperature <= 8:
            return "Cool"
        return "Sun"
    if temperature >= 30:
        return "Hot"
    if temperature >= 24:
        return "Warm"
    if temperature <= 8:
        return "Cool"
    return "Mild"


def forecast_for_location(forecast_date, latitude, longitude):
    """Return the selected day's local-noon forecast in the app's data shape."""
    day = date.fromisoformat(str(forecast_date)[:10]).isoformat()
    response = requests.get(
        API_URL,
        params={
            "latitude": latitude,
            "longitude": longitude,
            "hourly": HOURLY_FIELDS,
            "forecast_days": 9,
            "timezone": "auto",
            "wind_speed_unit": "ms",
        },
        timeout=(5, 15),
    )
    response.raise_for_status()
    payload = response.json()
    hourly = payload.get("hourly") or {}
    times = hourly.get("time") or []
    if not times:
        raise RuntimeError("No forecast data is available for this location and date")

    target_time = f"{day}T12:00"
    index = next((i for i, value in enumerate(times) if value.startswith(target_time)), None)
    if index is None:
        raise RuntimeError("No forecast data is available for the selected date")

    temperature = float(_value(hourly, "temperature_2m", index))
    feels_like = float(_value(hourly, "apparent_temperature", index, temperature))
    humidity = float(_value(hourly, "relative_humidity_2m", index))
    rain_probability = int(_value(hourly, "precipitation_probability", index))
    rain_rate = float(_value(hourly, "rain", index))
    weather_code = int(_value(hourly, "weather_code", index))
    wind_speed = float(_value(hourly, "wind_speed_10m", index))
    wind_gusts = float(_value(hourly, "wind_gusts_10m", index, wind_speed))
    pressure = float(_value(hourly, "pressure_msl", index))
    visibility_m = float(_value(hourly, "visibility", index, 10000))

    if weather_code in STORM_CODES:
        storm_probability = rain_probability or 100
    else:
        storm_probability = 0
    if weather_code in SNOW_CODES:
        snow_probability = rain_probability or 100
    else:
        snow_probability = 0
    visibility = "Good" if visibility_m >= 10000 else "Fair" if visibility_m >= 4000 else "Poor"
    comfort_level = (
        "Cold" if feels_like < 10 else
        "Hot" if feels_like >= 30 else
        "Pleasant" if 18 <= feels_like < 26 and humidity < 70 else
        "Comfortable"
    )

    return {
        "temperature": {"air_temperature": temperature, "feels_like": feels_like},
        "humidity": {"percentage": humidity},
        "weather_conditions": {
            "primary": _primary_condition(weather_code, temperature),
            "visibility": visibility,
            "storm_probability": storm_probability,
        },
        "precipitation": {
            "rain_rate": rain_rate,
            "rain_probability": rain_probability,
            "snow_probability": snow_probability,
        },
        "wind": {"speed": wind_speed, "gusts": wind_gusts},
        "pressure": {"value": pressure},
        "comfort_index": {"comfort_level": comfort_level},
        "forecast_time": times[index],
        "timezone": payload.get("timezone", "GMT"),
    }
