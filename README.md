# 🌤️ Weaza Nasa Weather Prediction System

A sophisticated weather prediction system powered by XGBoost machine learning, featuring an interactive web interface with real-time weather forecasting.

## 🚀 Features

- **Real-time Weather Prediction**: Uses trained XGBoost model for accurate weather forecasting
- **Interactive Map**: Click to select locations or search by city name
- **Beautiful UI**: Modern, responsive design with weather-themed animations
- **Comprehensive Data**: Temperature, humidity, pressure, wind, precipitation probabilities
- **7-Day Forecast**: Predict weather up to 7 days in advance
- **Real Model Integration**: No mock data - all predictions from trained XGBoost model

## 📋 Prerequisites

- Python 3.8 or higher
- All model files must be present in the `models/` directory:
  - `model_info.pkl`
  - `xgb_model.json`
  - `scaler_X.pkl`
  - `scaler_y.pkl`

## 🛠️ Installation & Setup

### Quick Start (Recommended)
```bash
python start_weather_app.py
```

This script will:
- Check Python version
- Install all dependencies
- Verify model files exist
- Start both servers
- Open the website in your browser

### Manual Setup

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Start Model Server**
   ```bash
   python weather_model_server.py
   ```

3. **Start Website Server** (in another terminal)
   ```bash
   cd "weaza nasa"
   python -m http.server 8080
   ```

4. **Access the Application**
   - Website: http://localhost:8080
   - Model API: http://localhost:5000

## 🏗️ Project Structure

```
XGboost/
├── models/                          # Trained model files
│   ├── model_info.pkl              # Model metadata
│   ├── xgb_model.json              # XGBoost model
│   ├── scaler_X.pkl                # Input scaler
│   └── scaler_y.pkl                # Output scaler
├── weaza nasa/                      # Website files
│   ├── index.html                  # Main website
│   ├── app.js                      # Frontend JavaScript
│   ├── styles.css                  # Styling
│   ├── assets/                     # Icons and images
│   └── data/                       # Country/city data
├── weather_model_server.py         # XGBoost model API server
├── serve_website.py                # Website server script
├── start_weather_app.py            # Comprehensive startup script
├── requirements.txt                # Python dependencies
└── README.md                       # This file
```

## 🔧 API Endpoints

### Model Server (Port 5000)

- **POST /predict** - Get weather prediction
  ```json
  {
    "date": "2024-01-15T12:00",
    "latitude": 40.7128,
    "longitude": -74.0060
  }
  ```

- **GET /health** - Check server status
  ```json
  {
    "status": "healthy",
    "model_loaded": true
  }
  ```

## 🎯 How It Works

1. **User Input**: Select location on map or enter coordinates
2. **Date Selection**: Choose forecast date (up to 7 days ahead)
3. **Model Processing**: XGBoost model processes time features and coordinates
4. **Weather Prediction**: Returns comprehensive weather data
5. **Display**: Beautiful UI shows temperature, humidity, pressure, wind, etc.

## 🧠 Model Details

The system uses a trained XGBoost regression model that:
- Takes time features (day, month, year, hour, etc.)
- Includes cyclical encodings for temporal patterns
- Predicts 36 weather variables simultaneously
- Converts raw predictions to user-friendly weather states

## 🎨 Features

### Interactive Map
- Click to select location
- Drag marker to adjust position
- Search by city name
- Current location detection

### Weather Display
- Current temperature and "feels like"
- Wind speed and direction
- Humidity and pressure
- Precipitation probabilities
- Storm probability
- Comfort level assessment

### Responsive Design
- Works on desktop and mobile
- Dark/light theme toggle
- Weather-themed animations
- Accessible interface

## 🚨 Troubleshooting

### Model Server Issues
- Ensure all model files exist in `models/` directory
- Check Python version (3.8+ required)
- Verify all dependencies are installed

### Website Issues
- Check if website files exist in `weaza nasa/` directory
- Ensure port 8080 is available
- Try refreshing the browser

### Connection Issues
- Verify model server is running on port 5000
- Check browser console for errors
- Ensure no firewall blocking localhost connections

## 📱 Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 🔒 Security

- All processing happens locally
- No external API calls for weather data
- Model runs on your machine
- No data sent to external servers

## 📄 License

This project is for educational and research purposes.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section
2. Verify all files are present
3. Check Python version and dependencies
4. Review console logs for errors

---

**Powered by XGBoost Machine Learning** 🤖
