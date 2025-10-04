# 🌦️ Environmental Prediction Dashboard

A beautiful, modern web interface for predicting environmental variables using machine learning. This dashboard allows users to input any date in 2023 and get comprehensive environmental predictions including temperature, moisture, radiation, precipitation, and more.

## ✨ Features

- **🎯 Interactive Date Selection** - Choose any date in 2023
- **📊 Real-time Predictions** - Get instant environmental forecasts
- **🌡️ Weather Summary** - Human-readable weather conditions
- **📈 Interactive Charts** - Visualize temperature and moisture trends
- **🔍 Search & Filter** - Find specific environmental variables
- **🛡️ Confidence Intervals** - Understand prediction reliability
- **📱 Responsive Design** - Works on desktop, tablet, and mobile
- **⚡ Fast API** - Powered by Flask and scikit-learn

## 🚀 Quick Start

### Prerequisites

- Python 3.8 or higher
- Your `environment_data_2023.csv` file

### Installation

1. **Clone or download the project files**
   ```bash
   # Make sure you have these files in your project directory:
   # - index.html
   # - styles.css
   # - script.js
   # - app.py
   # - requirements.txt
   # - templates/index.html
   # - environment_data_2023.csv
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the Flask API server**
   ```bash
   python app.py
   ```

4. **Open the web interface**
   - Open `index.html` in your web browser
   - Or visit `http://localhost:5000` if using the Flask template

## 📁 Project Structure

```
environmental-dashboard/
├── index.html              # Main web interface
├── styles.css              # CSS styling
├── script.js               # JavaScript functionality
├── app.py                  # Flask API server
├── requirements.txt        # Python dependencies
├── templates/
│   └── index.html          # Flask template version
├── environment_data_2023.csv  # Your data file
└── README.md               # This file
```

## 🔧 How It Works

### 1. **Data Processing**
- Loads your `environment_data_2023.csv` file
- Performs feature engineering (seasonal encoding)
- Trains a Random Forest model on all environmental variables

### 2. **Web Interface**
- Modern, responsive design with beautiful animations
- Interactive date picker for 2023 dates
- Real-time search and filtering of variables
- Dynamic charts and visualizations

### 3. **API Backend**
- Flask REST API serves predictions
- Handles date validation and error checking
- Generates confidence intervals
- Creates human-readable weather summaries

### 4. **Machine Learning**
- Random Forest regression for multi-output prediction
- Handles 38+ environmental variables simultaneously
- Seasonal pattern recognition using cyclical encoding
- Model persistence with joblib

## 🎨 Interface Features

### **Weather Summary Card**
- Temperature (actual and feels-like)
- Precipitation probabilities (rain, snow, storm)
- Sunshine and humidity indices
- Wind speed and conditions

### **Environmental Variables Table**
- All 38+ environmental variables
- Predicted values with units
- Confidence scores
- Search and category filtering

### **Interactive Charts**
- Temperature trends across different layers
- Moisture and precipitation distribution
- Real-time updates based on selected date

### **Confidence Analysis**
- Prediction reliability scores
- Top 5 most confident predictions
- Visual confidence bars

## 🛠️ Customization

### **Adding New Variables**
1. Update the `get_unit()` method in `app.py`
2. Modify the `generate_weather_summary()` function
3. Update the JavaScript filtering categories

### **Styling Changes**
- Edit `styles.css` for visual modifications
- Update color schemes in CSS variables
- Modify responsive breakpoints

### **API Enhancements**
- Add new endpoints in `app.py`
- Implement additional prediction methods
- Add data validation and caching

## 🔍 API Endpoints

- `POST /api/predict` - Get environmental predictions for a date
- `GET /api/health` - Check API health and model status
- `GET /api/variables` - List all available variables

### Example API Usage

```javascript
// Get predictions for February 15, 2023
fetch('http://localhost:5000/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: '2023-02-15' })
})
.then(response => response.json())
.then(data => console.log(data));
```

## 🐛 Troubleshooting

### **Common Issues**

1. **"Model not loaded" error**
   - Ensure `environment_data_2023.csv` is in the project directory
   - Check that the CSV file has the correct format

2. **API connection failed**
   - Make sure Flask server is running (`python app.py`)
   - Check that port 5000 is not blocked
   - Verify the API URL in `script.js`

3. **Charts not displaying**
   - Ensure Chart.js is loaded from CDN
   - Check browser console for JavaScript errors
   - Verify data format from API

4. **Styling issues**
   - Clear browser cache
   - Check that `styles.css` is properly linked
   - Verify font and icon CDN connections

### **Performance Tips**

- The model trains automatically on first run
- Subsequent runs load the saved model (faster)
- Use the search/filter to find specific variables
- Charts update automatically with new predictions

## 📊 Model Performance

The Random Forest model provides:
- **Multi-output regression** for 38+ variables
- **Seasonal pattern recognition** using cyclical encoding
- **High accuracy** for temperature and moisture predictions
- **Confidence intervals** for uncertainty quantification

## 🤝 Contributing

Feel free to enhance this dashboard:
- Add new visualization types
- Implement additional ML models
- Improve the UI/UX design
- Add more environmental variables
- Create mobile app versions

## 📄 License

This project is open source and available under the MIT License.

---

**🌍 Built with ❤️ for environmental science and machine learning**

*Predict the environment, protect the planet!*
