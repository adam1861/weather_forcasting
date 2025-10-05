from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
import joblib
import xgboost as xgb
from datetime import datetime
import warnings
import os
warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global variables for model components
xgb_model = None
scaler_X = None
scaler_y = None
time_features = None
target_columns = None

def load_model():
    """Load the trained XGBoost model and scalers"""
    global xgb_model, scaler_X, scaler_y, time_features, target_columns
    
    try:
        # Check if model files exist
        model_files = ['models/model_info.pkl', 'models/xgb_model.json', 'models/scaler_X.pkl', 'models/scaler_y.pkl']
        for file_path in model_files:
            if not os.path.exists(file_path):
                print(f"❌ Model file not found: {file_path}")
                return False
        
        # Load model info
        model_info = joblib.load('models/model_info.pkl')
        time_features = model_info['time_features']
        target_columns = model_info['target_columns']
        
        # Load XGBoost model
        xgb_model = xgb.XGBRegressor()
        xgb_model.load_model('models/xgb_model.json')
        
        # Set the model parameters to match training
        xgb_params = model_info.get('xgb_params', {})
        for param, value in xgb_params.items():
            if hasattr(xgb_model, param):
                setattr(xgb_model, param, value)
        
        # Load scalers
        scaler_X = joblib.load('models/scaler_X.pkl')
        scaler_y = joblib.load('models/scaler_y.pkl')
        
        print("XGBoost model loaded successfully!")
        print(f"Time features: {len(time_features)}")
        print(f"Target variables: {len(target_columns)}")
        return True
        
    except Exception as e:
        print(f"Error loading model: {e}")
        return False

def predict_weather(date_str, lat, lon):
    """
    Predict weather for given date and coordinates using XGBoost model
    """
    try:
        # Validate model is loaded
        if xgb_model is None or scaler_X is None or scaler_y is None:
            print("Model not loaded")
            return None
        
        # Convert input to datetime
        if isinstance(date_str, str):
            time_dt = pd.to_datetime(date_str)
        else:
            time_dt = date_str
        
        # Extract time features
        features = {
            'day_of_year': time_dt.timetuple().tm_yday,
            'month': time_dt.month,
            'year': time_dt.year,
            'day_of_week': time_dt.weekday(),
            'is_weekend': 1 if time_dt.weekday() in [5, 6] else 0,
            'hour': time_dt.hour
        }
        
        # Add cyclical encodings
        features['sin_day_of_year'] = np.sin(2 * np.pi * features['day_of_year'] / 366)
        features['cos_day_of_year'] = np.cos(2 * np.pi * features['day_of_year'] / 366)
        features['sin_month'] = np.sin(2 * np.pi * features['month'] / 12)
        features['cos_month'] = np.cos(2 * np.pi * features['month'] / 12)
        features['sin_day_of_week'] = np.sin(2 * np.pi * features['day_of_week'] / 7)
        features['cos_day_of_week'] = np.cos(2 * np.pi * features['day_of_week'] / 7)
        features['sin_hour'] = np.sin(2 * np.pi * features['hour'] / 24)
        features['cos_hour'] = np.cos(2 * np.pi * features['hour'] / 24)
        
        # Convert to array and scale
        X_input = np.array([features[feat] for feat in time_features]).reshape(1, -1)
        X_input_scaled = scaler_X.transform(X_input)
        
        # Make prediction
        y_pred_scaled = xgb_model.predict(X_input_scaled)
        y_pred = scaler_y.inverse_transform(y_pred_scaled)
        
        # Create result dictionary
        raw_predictions = {}
        for i, target_var in enumerate(target_columns):
            raw_predictions[target_var] = float(y_pred[0, i])
        
        # Convert to user-friendly weather states
        weather_data = convert_to_weather_states(raw_predictions, lat, lon)
        
        return weather_data
        
    except Exception as e:
        print(f"Error in prediction: {e}")
        return None

def convert_to_weather_states(raw_predictions, lat, lon):
    """
    Convert raw model predictions to user-friendly weather states
    Using mathematical relationships from akhir haja.py
    """
    try:
        # Extract variables from raw predictions
        temp_air = raw_predictions.get('Tair_f_inst', 273.15)
        temp_air_celsius = temp_air - 273.15
        temp_air_kelvin = temp_air
        
        # Specific humidity (already in kg/kg, no conversion needed)
        q_raw = raw_predictions.get('Qair_f_inst', 0.0)
        q = q_raw  # keep in kg/kg
        
        # Surface pressure (convert from Pa to hPa)
        pressure_pa = raw_predictions.get('Psurf_f_inst', 101325)
        pressure_hpa = pressure_pa / 100
        
        # Wind components
        u_wind = raw_predictions.get('U_f_inst', 0.0)
        v_wind = raw_predictions.get('V_f_inst', 0.0)
        wind_speed = np.sqrt(u_wind**2 + v_wind**2)
        
        # Precipitation rates
        rain_rate = raw_predictions.get('Rainf_tavg', 0.0)
        snow_rate = raw_predictions.get('Snowf_tavg', 0.0)
        
        # Albedo for cloud cover estimation
        albedo = raw_predictions.get('Albedo_inst', 0.0)
        
        # === MATHEMATICAL RELATIONSHIPS FROM AKHIR HAJA.PY ===
        
        # 1. Relative Humidity calculation
        # q is already in kg/kg
        q_kg_kg = q
        # Calculate vapor pressure
        e = q_kg_kg * pressure_hpa / (0.622 + 0.378 * q_kg_kg)
        # Calculate saturation vapor pressure
        e_sat = np.exp(13.7 - (5120 / temp_air_kelvin))
        # Relative humidity (%)
        relative_humidity = 100 * e / e_sat if e_sat > 0 else 0
        # Ensure humidity is within reasonable bounds
        relative_humidity = min(100, max(0, relative_humidity))
        
        # 2. Heat Index calculation (only for temperatures >= 27°C)
        temp_fahrenheit = temp_air_celsius * 9/5 + 32
        if temp_air_celsius >= 27:
            heat_index_f = (-42.379 + 2.04901523*temp_fahrenheit + 10.14333127*relative_humidity 
                          - 0.22475541*temp_fahrenheit*relative_humidity
                          - 0.00683783*temp_fahrenheit**2 - 0.05481717*relative_humidity**2 
                          + 0.00122874*temp_fahrenheit**2*relative_humidity
                          + 0.00085282*temp_fahrenheit*relative_humidity**2 
                          - 0.00000199*temp_fahrenheit**2*relative_humidity**2)
            heat_index_celsius = (heat_index_f - 32) * 5/9
        else:
            heat_index_celsius = temp_air_celsius
        
        # 3. Wind gusts estimation
        wind_gusts = wind_speed * 1.5
        
        # 4. Weather probabilities using mathematical relationships
        rain_probability = min(100, max(0, int(rain_rate * 100)))
        snow_probability = min(100, max(0, int(snow_rate * 100)))
        sunny_probability = max(0, 100 - int(albedo * 10))
        storm_probability = min(100, int(wind_speed * 10))
        
        # 5. Wind chill calculation (for cold temperatures)
        if temp_air_celsius <= 10 and wind_speed >= 4.8:
            wind_chill = 13.12 + 0.6215*temp_air_celsius - 11.37*(wind_speed**0.16) + 0.3965*temp_air_celsius*(wind_speed**0.16)
        else:
            wind_chill = temp_air_celsius
        
        weather_states = {
            'location': {
                'latitude': lat,
                'longitude': lon,
                'coordinates': f"{lat:.2f}°N, {lon:.2f}°E" if lon >= 0 else f"{lat:.2f}°N, {abs(lon):.2f}°W"
            },
            'temperature': {
                'air_temperature': round(temp_air_celsius, 1),
                'feels_like': round(heat_index_celsius, 1),
                'wind_chill': round(wind_chill, 1),
                'unit': '°C'
            },
            'precipitation': {
                'rain_probability': rain_probability,
                'snow_probability': snow_probability,
                'rain_rate': round(rain_rate, 3),
                'snow_rate': round(snow_rate, 3)
            },
            'wind': {
                'speed': round(wind_speed, 1),
                'gusts': round(wind_gusts, 1),
                'unit': 'm/s',
                'description': get_wind_description(wind_speed)
            },
            'humidity': {
                'percentage': round(relative_humidity, 1),
                'description': get_humidity_description(relative_humidity)
            },
            'pressure': {
                'value': round(pressure_hpa, 1),
                'unit': 'hPa',
                'description': get_pressure_description(pressure_hpa)
            },
            'weather_conditions': {
                'primary': get_primary_condition(rain_rate, snow_rate, temp_air_celsius),
                'storm_probability': storm_probability,
                'sunny_probability': sunny_probability,
                'visibility': get_visibility_description(relative_humidity, rain_rate)
            },
            'comfort_index': {
                'heat_index': round(heat_index_celsius, 1),
                'wind_chill': round(wind_chill, 1),
                'comfort_level': get_comfort_level(temp_air_celsius, relative_humidity, wind_speed)
            }
        }
        
        return weather_states
        
    except Exception as e:
        print(f"Error converting weather states: {e}")
        return None

def get_wind_description(speed):
    """Get wind description based on speed"""
    if speed < 0.5:
        return "Calm"
    elif speed < 3.3:
        return "Light breeze"
    elif speed < 5.5:
        return "Gentle breeze"
    elif speed < 7.9:
        return "Moderate breeze"
    elif speed < 10.7:
        return "Fresh breeze"
    elif speed < 13.8:
        return "Strong breeze"
    else:
        return "High winds"

def get_humidity_description(humidity):
    """Get humidity description"""
    if humidity < 30:
        return "Very dry"
    elif humidity < 50:
        return "Dry"
    elif humidity < 70:
        return "Comfortable"
    elif humidity < 90:
        return "Humid"
    else:
        return "Very humid"

def get_pressure_description(pressure):
    """Get pressure description"""
    if pressure < 1000:
        return "Low pressure"
    elif pressure < 1020:
        return "Normal pressure"
    else:
        return "High pressure"

def get_primary_condition(rain_rate, snow_rate, temp):
    """Determine primary weather condition"""
    if snow_rate > 0.001 and temp < 0:
        return "Snow"
    elif rain_rate > 0.001:
        return "Rain"
    elif temp < 0:
        return "Freezing"
    elif temp > 30:
        return "Hot"
    elif temp > 25:
        return "Warm"
    elif temp < 10:
        return "Cool"
    else:
        return "Mild"

def calculate_storm_probability(wind_speed, rain_rate, pressure):
    """Calculate storm probability based on multiple factors"""
    wind_factor = min(1, wind_speed / 15)  # Normalize wind speed
    rain_factor = min(1, rain_rate * 1000)  # Normalize rain rate
    pressure_factor = max(0, (1013 - pressure) / 50)  # Lower pressure = higher storm risk
    
    storm_prob = (wind_factor * 0.4 + rain_factor * 0.4 + pressure_factor * 0.2) * 100
    return min(100, max(0, round(storm_prob, 1)))

def get_visibility_description(humidity, rain_rate):
    """Get visibility description"""
    if rain_rate > 0.01:
        return "Poor (rain)"
    elif humidity > 90:
        return "Poor (fog)"
    elif humidity > 80:
        return "Fair"
    else:
        return "Good"

def calculate_heat_index(temp, humidity):
    """Calculate heat index"""
    if temp < 27:
        return temp
    # Simplified heat index calculation
    hi = temp + 0.5 * (humidity - 50)
    return round(hi, 1)

def calculate_wind_chill(temp, wind_speed):
    """Calculate wind chill"""
    if temp > 10 or wind_speed < 4.8:
        return temp
    # Simplified wind chill calculation
    wc = 13.12 + 0.6215 * temp - 11.37 * (wind_speed ** 0.16) + 0.3965 * temp * (wind_speed ** 0.16)
    return round(wc, 1)

def get_comfort_level(temp, humidity, wind_speed):
    """Get comfort level description"""
    if temp < 0:
        return "Very cold"
    elif temp < 10:
        return "Cold"
    elif temp < 20:
        if humidity > 80:
            return "Cool and humid"
        else:
            return "Cool"
    elif temp < 25:
        if humidity > 80:
            return "Warm and humid"
        else:
            return "Pleasant"
    elif temp < 30:
        if humidity > 70:
            return "Hot and humid"
        else:
            return "Warm"
    else:
        return "Very hot"

@app.route('/predict', methods=['POST'])
def predict():
    """API endpoint for weather prediction"""
    try:
        data = request.get_json()
        
        # Validate input
        if not data or 'date' not in data or 'latitude' not in data or 'longitude' not in data:
            return jsonify({'error': 'Missing required fields: date, latitude, longitude'}), 400
        
        date = data['date']
        lat = float(data['latitude'])
        lon = float(data['longitude'])
        
        # Validate coordinates
        if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
            return jsonify({'error': 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180'}), 400
        
        # Validate date format
        try:
            pd.to_datetime(date)
        except:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DDTHH:MM format'}), 400
        
        # Make prediction
        weather_data = predict_weather(date, lat, lon)
        
        if weather_data is None:
            return jsonify({'error': 'Failed to generate weather prediction'}), 500
        
        return jsonify({
            'success': True,
            'data': weather_data
        })
        
    except ValueError as e:
        return jsonify({'error': f'Invalid input: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'model_loaded': xgb_model is not None})

if __name__ == '__main__':
    # Load model on startup
    if load_model():
        print("Starting XGBoost Weather Prediction Server...")
        print("Server will be available at: http://localhost:5000")
        print("Press Ctrl+C to stop the server")
        app.run(debug=False, host='0.0.0.0', port=5000)
    else:
        print("Failed to load model. Please check model files.")
        print("Make sure these files exist:")
        print("   - models/model_info.pkl")
        print("   - models/xgb_model.json") 
        print("   - models/scaler_X.pkl")
        print("   - models/scaler_y.pkl")

