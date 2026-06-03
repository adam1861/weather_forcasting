// Weather App with Interactive Map
class WeatherApp {
  constructor() {
    this.map = null;
    this.marker = null;
    this.currentCoords = null;
    this.weatherData = null;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.initializeMap();
    this.setupDatePicker();
    this.setupColorScheme();
    this.loadCountries();
  }

  setupEventListeners() {
    // Search form
    document.querySelector('.search').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSearch();
    });

    // Coordinate inputs
    document.getElementById('lat').addEventListener('input', () => this.updateMapFromInputs());
    document.getElementById('lng').addEventListener('input', () => this.updateMapFromInputs());

    // Use current location button
    document.getElementById('useLocation').addEventListener('click', () => {
      this.getCurrentLocation();
    });

    // Convert format button
    document.getElementById('convertFormat').addEventListener('click', () => {
      this.convertCoordinateFormat();
    });

    // Predict button
    document.getElementById('predictBtn').addEventListener('click', () => {
      this.predictWeather();
    });

    // Hierarchical selectors
    document.getElementById('country').addEventListener('change', (e) => {
      this.handleCountryChange(e.target.value);
    });

    document.getElementById('city').addEventListener('change', (e) => {
      this.handleCityChange(e.target.value);
    });
  }

  initializeMap() {
    // Initialize Leaflet map
    this.map = L.map('map', {
      center: [40.7128, -74.0060], // Default to New York
      zoom: 10,
      zoomControl: true,
      attributionControl: true
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    // Add click event to map
    this.map.on('click', (e) => {
      this.updateCoordinates(e.latlng.lat, e.latlng.lng);
      this.addMarker(e.latlng);
    });

    // Add initial marker
    this.addMarker([40.7128, -74.0060]);
    this.updateCoordinates(40.7128, -74.0060);
  }

  addMarker(latlng) {
    // Remove existing marker
    if (this.marker) {
      this.map.removeLayer(this.marker);
    }

    // Add new marker
    this.marker = L.marker(latlng, {
      draggable: true
    }).addTo(this.map);

    // Add drag event
    this.marker.on('dragend', (e) => {
      const position = e.target.getLatLng();
      this.updateCoordinates(position.lat, position.lng);
    });
  }

  updateCoordinates(lat, lng) {
    this.currentCoords = { lat, lng };
    
    // Update input fields
    document.getElementById('lat').value = lat.toFixed(6);
    document.getElementById('lng').value = lng.toFixed(6);
    
    // Update map display
    document.getElementById('mapLat').textContent = lat.toFixed(6);
    document.getElementById('mapLng').textContent = lng.toFixed(6);

    // Clear any coordinate errors
    this.clearCoordinateError();
  }

  updateMapFromInputs() {
    const lat = parseFloat(document.getElementById('lat').value);
    const lng = parseFloat(document.getElementById('lng').value);

    if (!isNaN(lat) && !isNaN(lng) && this.isValidCoordinate(lat, lng)) {
      this.map.setView([lat, lng], this.map.getZoom());
      this.addMarker([lat, lng]);
      this.updateCoordinates(lat, lng);
    }
  }

  isValidCoordinate(lat, lng) {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  getCurrentLocation() {
    if (!navigator.geolocation) {
      this.showCoordinateError('Geolocation is not supported by this browser.');
      return;
    }

    const button = document.getElementById('useLocation');
    const originalText = button.textContent;
    button.textContent = 'Getting location...';
    button.disabled = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        this.map.setView([latitude, longitude], 12);
        this.addMarker([latitude, longitude]);
        this.updateCoordinates(latitude, longitude);
        
        button.textContent = originalText;
        button.disabled = false;
      },
      (error) => {
        let message = 'Unable to retrieve your location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied by user.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out.';
            break;
        }
        this.showCoordinateError(message);
        
        button.textContent = originalText;
        button.disabled = false;
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  }

  convertCoordinateFormat() {
    const lat = document.getElementById('lat').value;
    const lng = document.getElementById('lng').value;

    if (!lat || !lng) {
      this.showCoordinateError('Please enter both latitude and longitude values.');
      return;
    }

    // Simple conversion between decimal degrees and degrees/minutes/seconds
    // This is a basic implementation - you might want to enhance it
    try {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      
      if (this.isValidCoordinate(latNum, lngNum)) {
        // For now, just show a message that conversion is available
        alert('Coordinate format conversion feature - to be implemented with DMS format support');
      } else {
        this.showCoordinateError('Invalid coordinate values.');
      }
    } catch (error) {
      this.showCoordinateError('Invalid coordinate format.');
    }
  }

  showCoordinateError(message) {
    const errorEl = document.getElementById('coordError');
    errorEl.textContent = message;
    errorEl.hidden = false;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorEl.hidden = true;
    }, 5000);
  }

  clearCoordinateError() {
    document.getElementById('coordError').hidden = true;
  }

  handleSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;

    // Check if it's coordinates
    const coordMatch = query.match(/^(-?\d+\.?\d*),?\s*(-?\d+\.?\d*)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (this.isValidCoordinate(lat, lng)) {
        this.map.setView([lat, lng], 12);
        this.addMarker([lat, lng]);
        this.updateCoordinates(lat, lng);
        return;
      }
    }

    // Otherwise, treat as city name and geocode
    this.geocodeLocation(query);
  }

  async geocodeLocation(query) {
    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`
      );
      
      if (!response.ok) throw new Error('Geocoding failed');
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const lat = result.latitude;
        const lng = result.longitude;
        
        this.map.setView([lat, lng], 12);
        this.addMarker([lat, lng]);
        this.updateCoordinates(lat, lng);
      } else {
        this.showCoordinateError('Location not found. Please try a different search term.');
      }
    } catch (error) {
      this.showCoordinateError('Failed to search for location. Please check your internet connection.');
    }
  }

  setupDatePicker() {
    const datePicker = document.getElementById('datePicker');
    const dateDisplay = document.getElementById('dateDisplay');
    
    // Set default date to today
    const today = new Date();
    datePicker.value = today.toISOString().split('T')[0];
    dateDisplay.textContent = today.toLocaleDateString();
    
    // Set max date to 7 days from today
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 7);
    datePicker.max = maxDate.toISOString().split('T')[0];
    
    // Update display when date changes
    datePicker.addEventListener('change', (e) => {
      const selectedDate = new Date(e.target.value);
      dateDisplay.textContent = selectedDate.toLocaleDateString();
    });
  }

  setupColorScheme() {
    const toggle = document.getElementById('colorSchemeToggle');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Initialize with system preference
    if (prefersDark) {
      document.documentElement.setAttribute('data-color-scheme', 'dark');
      toggle.setAttribute('aria-pressed', 'false');
    } else {
      document.documentElement.setAttribute('data-color-scheme', 'light');
      toggle.setAttribute('aria-pressed', 'true');
    }
    
    toggle.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-color-scheme') === 'dark';
      document.documentElement.setAttribute('data-color-scheme', isDark ? 'light' : 'dark');
      toggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    });
  }

  async predictWeather() {
    if (!this.currentCoords) {
      this.showApiError('Please select a location first by clicking on the map or entering coordinates.');
      return;
    }

    const button = document.getElementById('predictBtn');
    const buttonContent = button.querySelector('.btn__content');
    const spinner = button.querySelector('.spinner');
    const datePicker = document.getElementById('datePicker');
    
    // Show loading state
    button.disabled = true;
    buttonContent.textContent = 'Predicting...';
    spinner.style.display = 'inline-block';
    
    try {
      const selectedDate = new Date(datePicker.value);
      const today = new Date();
      const daysFromNow = Math.ceil((selectedDate - today) / (1000 * 60 * 60 * 24));
      
      // Validate date range
      if (daysFromNow < 0) {
        throw new Error('Cannot predict weather for past dates');
      }
      if (daysFromNow > 7) {
        throw new Error('Cannot predict weather more than 7 days ahead');
      }
      
      // Get weather data
      const weatherData = await this.fetchWeatherData(daysFromNow);
      
      if (weatherData) {
        this.updateWeatherDisplay(weatherData);
        this.updateWeatherTheme(weatherData);
      }
    } catch (error) {
      this.showApiError(`Failed to get weather prediction: ${error.message}. Please check if the model server is running.`);
      console.error('Weather prediction error:', error);
    } finally {
      // Hide loading state
      button.disabled = false;
      buttonContent.textContent = 'Predict the Weather';
      spinner.style.display = 'none';
    }
  }

  async fetchWeatherData(daysFromNow) {
    const { lat, lng } = this.currentCoords;
    const datePicker = document.getElementById('datePicker');
    const selectedDate = new Date(datePicker.value);
    
    try {
      // Call our XGBoost model API
      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: selectedDate.toISOString().slice(0, 16), // Format: YYYY-MM-DDTHH:MM
          latitude: lat,
          longitude: lng
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Model API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        return this.convertModelDataToWeather(data.data);
      }
      
      throw new Error(data.error || 'No weather data available from model');
    } catch (error) {
      console.error('Failed to get weather prediction:', error);
      throw error; // Don't fallback to mock data
    }
  }

  convertModelDataToWeather(modelData) {
    // Convert XGBoost model output to weather display format
    return {
      temp: Math.round(modelData.temperature.air_temperature),
      feelslike: Math.round(modelData.temperature.feels_like),
      humidity: Math.round(modelData.humidity.percentage),
      conditions: this.getWeatherCondition(modelData.weather_conditions.primary),
      precip: modelData.precipitation.rain_rate,
      precipprob: modelData.precipitation.rain_probability,
      windSpeed: modelData.wind.speed,
      windGusts: modelData.wind.speed * 1.3, // Estimate gusts
      pressure: modelData.pressure.value,
      visibility: modelData.weather_conditions.visibility,
      stormProb: modelData.weather_conditions.storm_probability,
      snowProb: modelData.precipitation.snow_probability,
      comfortLevel: modelData.comfort_index.comfort_level
    };
  }

  getWeatherCondition(primary) {
    // Convert model primary condition to display-friendly text
    const conditions = {
      'Sun': 'Sunny',
      'Rain': 'Rainy', 
      'Snow': 'Snowy',
      'Freezing': 'Freezing',
      'Hot': 'Hot',
      'Warm': 'Warm',
      'Cool': 'Cool',
      'Mild': 'Partly Cloudy'
    };
    return conditions[primary] || 'Partly Cloudy';
  }


  updateWeatherDisplay(data) {
    // Update current weather card
    document.getElementById('currentTemp').textContent = Math.round(data.temp);
    document.getElementById('currentFeelsLike').textContent = Math.round(data.feelslike);
    document.getElementById('currentCondition').textContent = data.conditions || 'Partly sunny';
    document.getElementById('shadeTemp').textContent = Math.round(data.feelslike - 2) + '°';
    
    // Update wind data with real model data
    const windSpeed = Math.round(data.windSpeed || 0);
    const windGusts = Math.round(data.windGusts || windSpeed * 1.3);
    document.getElementById('windSpeed').textContent = `${windSpeed} m/s`;
    document.getElementById('windGusts').textContent = `${windGusts} m/s`;
    
    // Update additional weather metrics from model
    document.getElementById('humidity').textContent = `${Math.round(data.humidity || 0)}%`;
    document.getElementById('pressure').textContent = `${Math.round(data.pressure || 0)} hPa`;
    document.getElementById('visibility').textContent = data.visibility || 'Good';
    document.getElementById('comfortLevel').textContent = data.comfortLevel || 'Pleasant';
    
    // Update tonight's weather (using model data for realistic estimates)
    const tonightLow = Math.round(data.temp - (data.temp > 0 ? 8 : 5));
    const tomorrowHigh = Math.round(data.temp + (data.temp > 0 ? 3 : 2));
    document.getElementById('tonightLow').textContent = tonightLow;
    document.getElementById('tomorrowHigh').textContent = tomorrowHigh;
    
    // Update current time
    const now = new Date();
    document.getElementById('currentTime').textContent = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    // Update tonight's date
    const tonight = new Date(now);
    tonight.setDate(tonight.getDate() + 1);
    document.getElementById('tonightDate').textContent = tonight.toLocaleDateString([], {weekday: 'short', month: 'short', day: 'numeric'});
    
    // Calculate and display probabilities from model data
    const probabilities = this.calculateWeatherProbabilitiesFromModel(data);
    document.getElementById('probSunny').textContent = Math.round(probabilities.sunny);
    document.getElementById('probRainy').textContent = Math.round(probabilities.rainy);
    document.getElementById('probSnowy').textContent = Math.round(probabilities.snowy);
    document.getElementById('probStorm').textContent = Math.round(probabilities.storm);
  }

  calculateWeatherProbabilitiesFromModel(data) {
    // Use model data directly for probabilities
    const rainProb = data.precipprob || 0;
    const snowProb = data.snowProb || 0;
    const stormProb = data.stormProb || 0;
    
    // Calculate sunny probability as inverse of other conditions
    const otherProbs = rainProb + snowProb + stormProb;
    const sunnyProb = Math.max(0, 100 - otherProbs);
    
    return {
      sunny: Math.round(sunnyProb),
      rainy: Math.round(rainProb),
      snowy: Math.round(snowProb),
      storm: Math.round(stormProb)
    };
  }


  updateWeatherTheme(data) {
    const condition = data.conditions?.toLowerCase() || 'sunny';
    let theme = 'sunny';
    
    if (condition.includes('rain')) theme = 'rainy';
    else if (condition.includes('snow')) theme = 'snowy';
    else if (condition.includes('storm') || condition.includes('thunder')) theme = 'storm';
    
    document.body.setAttribute('data-theme', theme);
  }

  showApiError(message) {
    const errorEl = document.getElementById('apiError');
    errorEl.textContent = message;
    errorEl.hidden = false;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorEl.hidden = true;
    }, 5000);
  }

  // Hierarchical selector handlers
  async handleCountryChange(country) {
    if (!country) return;
    
    // Load cities directly for the selected country
    try {
      const response = await fetch(`data/cities/${encodeURIComponent(country)}.json`);
      if (response.ok) {
        const cities = await response.json();
        this.populateCitySelect(cities);
      } else {
        // Fallback to local data
        this.populateCitySelect(this.getLocalCities(country));
      }
    } catch (error) {
      console.warn('Failed to load cities:', error);
      // Fallback to local data
      this.populateCitySelect(this.getLocalCities(country));
    }
  }

  async handleCityChange(city) {
    if (!city) return;
    
    // Geocode the city and update map
    const country = document.getElementById('country').value;
    const fullLocation = `${city}, ${country}`;
    
    await this.geocodeLocation(fullLocation);
  }

  async loadCountries() {
    const countrySelect = document.getElementById('country');
    
    try {
      const response = await fetch('data/countries.json');
      let countries = [];
      
      if (response.ok) {
        countries = await response.json();
      } else {
        // Fallback countries
        countries = [
          { name: 'United States', code: 'US' },
          { name: 'Canada', code: 'CA' },
          { name: 'United Kingdom', code: 'GB' },
          { name: 'France', code: 'FR' },
          { name: 'Germany', code: 'DE' },
          { name: 'Italy', code: 'IT' },
          { name: 'Spain', code: 'ES' },
          { name: 'Netherlands', code: 'NL' },
          { name: 'India', code: 'IN' },
          { name: 'China', code: 'CN' },
          { name: 'Japan', code: 'JP' },
          { name: 'South Korea', code: 'KR' },
          { name: 'Australia', code: 'AU' },
          { name: 'Brazil', code: 'BR' },
          { name: 'Mexico', code: 'MX' },
          { name: 'Argentina', code: 'AR' },
          { name: 'South Africa', code: 'ZA' },
          { name: 'Egypt', code: 'EG' },
          { name: 'Morocco', code: 'MA' },
          { name: 'Turkey', code: 'TR' }
        ];
      }
      
      // Clear existing options
      countrySelect.innerHTML = '<option value="" disabled selected>Select a country</option>';
      
      // Add country options
      countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country.name;
        option.textContent = country.name;
        countrySelect.appendChild(option);
      });
      
      console.log('Loaded countries:', countries.length);
      
    } catch (error) {
      console.error('Failed to load countries:', error);
      // Still add fallback countries
      const fallbackCountries = [
        'United States', 'Canada', 'United Kingdom', 'France', 'Germany',
        'Italy', 'Spain', 'Japan', 'Australia', 'Brazil', 'India', 'China'
      ];
      
      countrySelect.innerHTML = '<option value="" disabled selected>Select a country</option>';
      fallbackCountries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        countrySelect.appendChild(option);
      });
    }
  }

  getLocalCities(country) {
    // Local fallback data for countries
    const localCities = {
      'United States': [
        { name: 'New York City' },
        { name: 'Los Angeles' },
        { name: 'Chicago' },
        { name: 'Houston' },
        { name: 'Phoenix' },
        { name: 'Philadelphia' },
        { name: 'San Antonio' },
        { name: 'San Diego' },
        { name: 'Dallas' },
        { name: 'San Jose' }
      ],
      'Canada': [
        { name: 'Toronto' },
        { name: 'Vancouver' },
        { name: 'Montreal' },
        { name: 'Calgary' },
        { name: 'Ottawa' }
      ],
      'United Kingdom': [
        { name: 'London' },
        { name: 'Manchester' },
        { name: 'Birmingham' },
        { name: 'Glasgow' },
        { name: 'Liverpool' }
      ],
      'France': [
        { name: 'Paris' },
        { name: 'Marseille' },
        { name: 'Lyon' },
        { name: 'Toulouse' },
        { name: 'Nice' }
      ],
      'Germany': [
        { name: 'Berlin' },
        { name: 'Hamburg' },
        { name: 'Munich' },
        { name: 'Cologne' },
        { name: 'Frankfurt' }
      ],
      'Italy': [
        { name: 'Rome' },
        { name: 'Milan' },
        { name: 'Naples' },
        { name: 'Turin' },
        { name: 'Palermo' }
      ],
      'Spain': [
        { name: 'Madrid' },
        { name: 'Barcelona' },
        { name: 'Valencia' },
        { name: 'Seville' },
        { name: 'Zaragoza' }
      ],
      'Japan': [
        { name: 'Tokyo' },
        { name: 'Osaka' },
        { name: 'Nagoya' },
        { name: 'Yokohama' },
        { name: 'Sapporo' }
      ],
      'Australia': [
        { name: 'Sydney' },
        { name: 'Melbourne' },
        { name: 'Brisbane' },
        { name: 'Perth' },
        { name: 'Adelaide' }
      ],
      'Brazil': [
        { name: 'São Paulo' },
        { name: 'Rio de Janeiro' },
        { name: 'Brasília' },
        { name: 'Salvador' },
        { name: 'Fortaleza' }
      ],
      'India': [
        { name: 'Mumbai' },
        { name: 'Delhi' },
        { name: 'Bangalore' },
        { name: 'Hyderabad' },
        { name: 'Ahmedabad' }
      ],
      'China': [
        { name: 'Beijing' },
        { name: 'Shanghai' },
        { name: 'Guangzhou' },
        { name: 'Shenzhen' },
        { name: 'Chengdu' }
      ],
      'Mexico': [
        { name: 'Mexico City' },
        { name: 'Guadalajara' },
        { name: 'Monterrey' },
        { name: 'Puebla' },
        { name: 'Tijuana' }
      ],
      'Thailand': [
        { name: 'Bangkok' },
        { name: 'Chiang Mai' },
        { name: 'Pattaya' },
        { name: 'Phuket' },
        { name: 'Hat Yai' }
      ],
      'Indonesia': [
        { name: 'Jakarta' },
        { name: 'Surabaya' },
        { name: 'Bandung' },
        { name: 'Medan' },
        { name: 'Semarang' }
      ],
      'Philippines': [
        { name: 'Manila' },
        { name: 'Quezon City' },
        { name: 'Davao' },
        { name: 'Cebu City' },
        { name: 'Zamboanga' }
      ],
      'Vietnam': [
        { name: 'Ho Chi Minh City' },
        { name: 'Hanoi' },
        { name: 'Da Nang' },
        { name: 'Hai Phong' },
        { name: 'Can Tho' }
      ],
      'Malaysia': [
        { name: 'Kuala Lumpur' },
        { name: 'George Town' },
        { name: 'Ipoh' },
        { name: 'Shah Alam' },
        { name: 'Petaling Jaya' }
      ],
      'Singapore': [
        { name: 'Singapore' },
        { name: 'Jurong East' },
        { name: 'Tampines' },
        { name: 'Woodlands' },
        { name: 'Sengkang' }
      ],
      'New Zealand': [
        { name: 'Auckland' },
        { name: 'Wellington' },
        { name: 'Christchurch' },
        { name: 'Hamilton' },
        { name: 'Tauranga' }
      ],
      'Argentina': [
        { name: 'Buenos Aires' },
        { name: 'Córdoba' },
        { name: 'Rosario' },
        { name: 'Mendoza' },
        { name: 'Tucumán' }
      ],
      'Chile': [
        { name: 'Santiago' },
        { name: 'Valparaíso' },
        { name: 'Concepción' },
        { name: 'La Serena' },
        { name: 'Antofagasta' }
      ],
      'Colombia': [
        { name: 'Bogotá' },
        { name: 'Medellín' },
        { name: 'Cali' },
        { name: 'Barranquilla' },
        { name: 'Cartagena' }
      ],
      'Peru': [
        { name: 'Lima' },
        { name: 'Arequipa' },
        { name: 'Trujillo' },
        { name: 'Chiclayo' },
        { name: 'Piura' }
      ],
      'South Africa': [
        { name: 'Johannesburg' },
        { name: 'Cape Town' },
        { name: 'Durban' },
        { name: 'Pretoria' },
        { name: 'Port Elizabeth' }
      ],
      'Egypt': [
        { name: 'Cairo' },
        { name: 'Alexandria' },
        { name: 'Giza' },
        { name: 'Shubra El Kheima' },
        { name: 'Port Said' }
      ],
      'Morocco': [
        { name: 'Casablanca' },
        { name: 'Rabat' },
        { name: 'Fez' },
        { name: 'Marrakech' },
        { name: 'Agadir' }
      ],
      'Nigeria': [
        { name: 'Lagos' },
        { name: 'Kano' },
        { name: 'Ibadan' },
        { name: 'Benin City' },
        { name: 'Port Harcourt' }
      ],
      'Kenya': [
        { name: 'Nairobi' },
        { name: 'Mombasa' },
        { name: 'Kisumu' },
        { name: 'Nakuru' },
        { name: 'Eldoret' }
      ],
      'Turkey': [
        { name: 'Istanbul' },
        { name: 'Ankara' },
        { name: 'Izmir' },
        { name: 'Bursa' },
        { name: 'Antalya' }
      ],
      'Israel': [
        { name: 'Jerusalem' },
        { name: 'Tel Aviv' },
        { name: 'Haifa' },
        { name: 'Rishon LeZion' },
        { name: 'Petah Tikva' }
      ],
      'Saudi Arabia': [
        { name: 'Riyadh' },
        { name: 'Jeddah' },
        { name: 'Mecca' },
        { name: 'Medina' },
        { name: 'Dammam' }
      ],
      'United Arab Emirates': [
        { name: 'Dubai' },
        { name: 'Abu Dhabi' },
        { name: 'Sharjah' },
        { name: 'Al Ain' },
        { name: 'Ajman' }
      ],
      'Norway': [
        { name: 'Oslo' },
        { name: 'Bergen' },
        { name: 'Trondheim' },
        { name: 'Stavanger' },
        { name: 'Kristiansand' }
      ],
      'Sweden': [
        { name: 'Stockholm' },
        { name: 'Gothenburg' },
        { name: 'Malmö' },
        { name: 'Uppsala' },
        { name: 'Västerås' }
      ],
      'Denmark': [
        { name: 'Copenhagen' },
        { name: 'Aarhus' },
        { name: 'Odense' },
        { name: 'Aalborg' },
        { name: 'Esbjerg' }
      ],
      'Finland': [
        { name: 'Helsinki' },
        { name: 'Espoo' },
        { name: 'Tampere' },
        { name: 'Vantaa' },
        { name: 'Turku' }
      ]
    };
    
    return localCities[country] || [];
  }

  populateCitySelect(cities) {
    const citySelect = document.getElementById('city');
    citySelect.innerHTML = '<option value="" disabled selected>Select a city</option>';
    
    cities.forEach(city => {
      const option = document.createElement('option');
      option.value = city.name;
      option.textContent = city.name;
      citySelect.appendChild(option);
    });
    
    citySelect.disabled = false;
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new WeatherApp();
  
  // Set current year in footer
  document.getElementById('year').textContent = new Date().getFullYear();
});