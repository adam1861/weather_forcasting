from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from datetime import datetime
import joblib
import os
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

class EnvironmentalPredictor:
    def __init__(self):
        self.model = None
        self.feature_columns = ['year', 'sin_day', 'cos_day']
        self.target_columns = None
        self.load_model()
    
    def load_model(self):
        """Load the trained model and target columns"""
        try:
            # Try to load a saved model first
            if os.path.exists('environment_model.pkl'):
                model_data = joblib.load('environment_model.pkl')
                self.model = model_data['model']
                self.target_columns = model_data['target_columns']
                print("Loaded saved model")
            else:
                # Train a new model if no saved model exists
                print("! No saved model found, training new model...")
                self.train_model()
        except Exception as e:
            print(f"X Error loading model: {e}")
            print("Training new model...")
            self.train_model()
    
    def train_model(self):
        """Train a new model from the CSV data"""
        try:
            # Load and prepare data
            df = pd.read_csv("environment_data_2023.csv")
            df["date"] = pd.to_datetime(df["date"])
            
            # Feature engineering
            df["year"] = df["date"].dt.year
            df["day_of_year"] = df["date"].dt.dayofyear
            df["sin_day"] = np.sin(2 * np.pi * df["day_of_year"] / 365)
            df["cos_day"] = np.cos(2 * np.pi * df["day_of_year"] / 365)
            
            # Prepare features and targets
            df_num = df.select_dtypes(include=[np.number])
            Y = df_num.drop(columns=["year", "sin_day", "cos_day"], errors="ignore")
            Y = Y.dropna(axis=1)
            X = df_num[self.feature_columns]
            
            # Train model
            self.model = RandomForestRegressor(
                n_estimators=300,
                random_state=42,
                n_jobs=-1
            )
            self.model.fit(X, Y)
            self.target_columns = list(Y.columns)
            
            # Save the model
            model_data = {
                'model': self.model,
                'target_columns': self.target_columns
            }
            joblib.dump(model_data, 'environment_model.pkl')
            print("Model trained and saved successfully")
            
        except Exception as e:
            print(f"X Error training model: {e}")
            raise e
    
    def predict(self, date_str, location=None):
        """Make predictions for a given date and location"""
        try:
            d = datetime.strptime(date_str, "%Y-%m-%d")
            year = d.year
            day_of_year = d.timetuple().tm_yday
            sin_day = np.sin(2 * np.pi * day_of_year / 365)
            cos_day = np.cos(2 * np.pi * day_of_year / 365)
            
            # For now, use only the original features to avoid model mismatch
            # In a production app, you would retrain the model with location features
            X_new = pd.DataFrame([[year, sin_day, cos_day]], columns=self.feature_columns)
            
            predictions = self.model.predict(X_new)[0]
            
            # Create results
            variables = []
            for i, col in enumerate(self.target_columns):
                variables.append({
                    'name': col,
                    'value': float(predictions[i]),
                    'unit': self.get_unit(col)
                })
            
            # Generate weather summary with location context
            summary = self.generate_weather_summary(predictions, location)
            
            # Generate confidence intervals (simplified)
            confidence = self.generate_confidence_intervals(predictions)
            
            result = {
                'date': date_str,
                'variables': variables,
                'summary': summary,
                'confidence': confidence
            }
            
            # Add location info to result
            if location:
                result['location'] = location
            
            return result
            
        except Exception as e:
            print(f"X Prediction error: {e}")
            raise e
    
    def get_unit(self, variable_name):
        """Get appropriate unit for a variable"""
        name_lower = variable_name.lower()
        if 'temperature' in name_lower:
            return 'K'
        elif 'moisture' in name_lower:
            return '%'
        elif 'speed' in name_lower:
            return 'm/s'
        elif 'pressure' in name_lower:
            return 'Pa'
        elif 'flux' in name_lower or 'radiation' in name_lower:
            return 'W/m²'
        elif 'precipitation' in name_lower or 'rain' in name_lower or 'snow' in name_lower:
            return 'mm/h'
        elif 'depth' in name_lower:
            return 'm'
        elif 'rate' in name_lower:
            return '1/s'
        else:
            return ''
    
    def generate_weather_summary(self, predictions, location=None):
        """Generate a human-readable weather summary"""
        try:
            # Find key variables
            temp_idx = next((i for i, col in enumerate(self.target_columns) 
                           if 'Air temperature' in col), None)
            wind_idx = next((i for i, col in enumerate(self.target_columns) 
                           if 'Wind speed' in col), None)
            precip_idx = next((i for i, col in enumerate(self.target_columns) 
                             if 'Total precipitation rate' in col), None)
            albedo_idx = next((i for i, col in enumerate(self.target_columns) 
                             if 'Albedo' in col), None)
            
            # Extract values
            temp_k = predictions[temp_idx] if temp_idx is not None else 273.15
            wind = predictions[wind_idx] if wind_idx is not None else 0
            precip = predictions[precip_idx] if precip_idx is not None else 0
            albedo = predictions[albedo_idx] if albedo_idx is not None else 0.3
            
            # Convert temperature
            temp_c = temp_k - 273.15
            
            # Calculate derived metrics
            feels_like = temp_c - 0.5 * wind + 2 * (precip * 100)
            rain_prob = min(100, (precip / 0.01) * 100)
            snow_prob = 100 if temp_k < 273 else max(0, 100 * (precip / 0.009))
            storm_prob = min(100, 30 * (wind / 10) + 40 * (precip / 0.01))
            sunshine = max(0, min(100, (1 - albedo/100) * 100))
            humidity = min(100, max(0, 50 + precip * 1000))
            
            return {
                'temperature': round(temp_c, 1),
                'feels_like': round(feels_like, 1),
                'rain_probability': round(rain_prob, 1),
                'snow_probability': round(snow_prob, 1),
                'storm_probability': round(storm_prob, 1),
                'sunshine_index': round(sunshine, 1),
                'humidity_index': round(humidity, 1),
                'wind_speed': round(wind, 1),
                'condition': self.get_weather_condition(temp_c, precip, wind, sunshine)
            }
            
        except Exception as e:
            print(f"X Error generating summary: {e}")
            return {
                'temperature': 0,
                'feels_like': 0,
                'rain_probability': 0,
                'snow_probability': 0,
                'storm_probability': 0,
                'sunshine_index': 0,
                'humidity_index': 0,
                'wind_speed': 0,
                'condition': 'Unknown'
            }
    
    def get_weather_condition(self, temp_c, precip, wind, sunshine):
        """Determine weather condition based on variables"""
        if precip > 0.01:
            if temp_c < 0:
                return 'Snowy'
            else:
                return 'Rainy'
        elif wind > 10:
            return 'Stormy'
        elif sunshine > 70:
            return 'Sunny'
        elif sunshine > 40:
            return 'Partly Cloudy'
        else:
            return 'Cloudy'
    
    def generate_confidence_intervals(self, predictions):
        """Generate confidence intervals for predictions"""
        # Simplified confidence based on variable type and magnitude
        confidence_data = []
        for i, col in enumerate(self.target_columns):
            value = predictions[i]
            name_lower = col.lower()
            
            # Base confidence on variable type
            if 'temperature' in name_lower:
                confidence = 0.85
            elif 'moisture' in name_lower:
                confidence = 0.80
            elif 'wind' in name_lower:
                confidence = 0.75
            elif 'precipitation' in name_lower:
                confidence = 0.70
            else:
                confidence = 0.80
            
            # Adjust based on value magnitude
            if abs(value) > 1000:
                confidence *= 0.9
            elif abs(value) < 0.001:
                confidence *= 0.8
            
            confidence_data.append({
                'variable': col,
                'confidence': min(0.95, max(0.5, confidence))
            })
        
        return confidence_data

# Initialize the predictor
predictor = EnvironmentalPredictor()

@app.route('/')
def index():
    """Serve the main dashboard page"""
    return render_template('index.html')

@app.route('/api/predict', methods=['POST'])
def predict():
    """API endpoint for environmental predictions"""
    try:
        data = request.get_json()
        date = data.get('date')
        location = data.get('location', {})
        
        if not date:
            return jsonify({'error': 'Date is required'}), 400
        
        # Validate date format
        try:
            datetime.strptime(date, '%Y-%m-%d')
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        # Make prediction with location data
        result = predictor.predict(date, location)
        
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ API Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': predictor.model is not None,
        'target_variables': len(predictor.target_columns) if predictor.target_columns else 0
    })

@app.route('/api/variables', methods=['GET'])
def get_variables():
    """Get list of available variables"""
    return jsonify({
        'variables': predictor.target_columns if predictor.target_columns else []
    })

if __name__ == '__main__':
    print("Starting Environmental Prediction API...")
    print("Model status:", "Loaded" if predictor.model is not None else "Not loaded")
    print("Server starting on http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
