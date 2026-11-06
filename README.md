# Weaza Nasa Weather Forecast

A location-aware weather forecasting app with an interactive map. Forecasts come from the Open-Meteo Forecast API and use the selected coordinates and local time zone.

## Features

- Choose a location on the map, search by city, enter coordinates, or use your current location.
- View a local-noon forecast for today through seven days ahead.
- See temperature, apparent temperature, humidity, precipitation, wind, pressure, visibility, and weather probabilities.
- Switch between light and dark themes.

Weather data is provided by [Open-Meteo](https://open-meteo.com/) under CC BY 4.0. The website links to the data source in its footer. The free API is for non-commercial use.

## Run locally

Requires Python 3.9+ and internet access.

```powershell
python start_weather_app.py
```

The startup script installs `requirements.txt`, starts the forecast API on port 5000 and the website on port 8080, then opens the website. You can also start the servers manually:

```powershell
pip install -r requirements.txt
python weather_model_server.py
```

In another terminal:

```powershell
Set-Location 'weaza nasa'
python -m http.server 8080
```

Open <http://localhost:8080>.

## Forecast API

`POST /predict` accepts an ISO date and WGS84 coordinates:

```json
{
  "date": "2026-11-06",
  "latitude": 33.5731,
  "longitude": -7.5898
}
```

`GET /health` reports the forecast source. The deployed Vercel API uses the same location-aware forecast helper as the local Flask server.
