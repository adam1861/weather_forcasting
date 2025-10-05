// Weather Oracle - Modern Environmental Dashboard JavaScript
class WeatherOracle {
    constructor() {
        this.apiBaseUrl = 'http://localhost:5000/api';
        this.currentData = null;
        this.charts = {};
        this.isLoading = false;
        this.animations = new Map();
        this.map = null;
        this.selectedLocation = null;
        this.countries = [];
        this.regions = [];
        this.cities = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setDefaultDate();
        this.initializeAnimations();
        this.setupThemeToggle();
        this.addParticleEffects();
        this.initializeLocationFeatures();
        this.loadCountries();
    }

    setupEventListeners() {
        // Predict button with enhanced feedback
        document.getElementById('predictBtn').addEventListener('click', (e) => {
            this.animateButtonClick(e.target);
            this.predictEnvironment();
        });

        // Retry button
        document.getElementById('retryBtn').addEventListener('click', () => {
            this.hideError();
            this.predictEnvironment();
        });

        // Enhanced search with debouncing
        let searchTimeout;
        document.getElementById('searchInput').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
            this.filterVariables(e.target.value);
            }, 300);
        });

        // Filter buttons with animations
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.animateFilterButton(e.target);
                this.setActiveFilter(e.target);
                this.filterByCategory(e.target.dataset.category);
            });
        });

        // Enter key on date input
        document.getElementById('dateInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.predictEnvironment();
            }
        });

        // Add hover effects to cards
        document.querySelectorAll('.glass-card').forEach(card => {
            card.addEventListener('mouseenter', () => this.animateCardHover(card, true));
            card.addEventListener('mouseleave', () => this.animateCardHover(card, false));
        });

        // Location tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchLocationTab(e.target.dataset.tab);
            });
        });

        // Country selection
        document.getElementById('countrySelect').addEventListener('change', (e) => {
            this.onCountryChange(e.target.value);
        });

        // Region selection
        document.getElementById('regionSelect').addEventListener('change', (e) => {
            this.onRegionChange(e.target.value);
        });

        // City selection
        document.getElementById('citySelect').addEventListener('change', (e) => {
            this.onCityChange(e.target.value);
        });

        // Coordinates input
        document.getElementById('latitudeInput').addEventListener('input', () => {
            this.updateLocationFromCoordinates();
        });

        document.getElementById('longitudeInput').addEventListener('input', () => {
            this.updateLocationFromCoordinates();
        });

        // Get current location
        document.getElementById('getLocationBtn').addEventListener('click', () => {
            this.getCurrentLocation();
        });

        // Map center button
        document.getElementById('mapCenterBtn').addEventListener('click', () => {
            this.centerMapOnLocation();
        });
    }

    setDefaultDate() {
        const today = new Date();
        const dateInput = document.getElementById('dateInput');
        dateInput.value = '2023-02-15'; // Default to a winter date
    }

    async predictEnvironment() {
        if (this.isLoading) return;
        
        const date = document.getElementById('dateInput').value;
        if (!date) {
            this.showError('Please select a date');
            return;
        }

        if (!this.selectedLocation) {
            this.showError('Please select a location using one of the methods above');
            return;
        }

        this.isLoading = true;
        this.showLoading();
        this.hideError();
        this.hideResults();

        try {
            // Add loading animation to button
            const predictBtn = document.getElementById('predictBtn');
            const originalText = predictBtn.querySelector('.btn-text').textContent;
            predictBtn.querySelector('.btn-text').textContent = 'Processing...';
            predictBtn.disabled = true;

            const requestData = {
                date: date,
                location: {
                    name: this.selectedLocation.name,
                    latitude: this.selectedLocation.latitude,
                    longitude: this.selectedLocation.longitude
                }
            };

            const response = await fetch(`${this.apiBaseUrl}/predict`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.currentData = data;
            
            // Add delay for better UX
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.displayResults(data);
            this.hideLoading();
            this.showResults();
            
            // Scroll to results
            this.smoothScrollToResults();

        } catch (error) {
            console.error('Prediction error:', error);
            this.hideLoading();
            this.showError('Failed to get predictions. Please make sure the API server is running.');
        } finally {
            this.isLoading = false;
            const predictBtn = document.getElementById('predictBtn');
            predictBtn.querySelector('.btn-text').textContent = 'Generate Prediction';
            predictBtn.disabled = false;
        }
    }

    displayResults(data) {
        this.displayWeatherSummary(data.summary);
        this.displayVariablesTable(data.variables);
        this.displayConfidenceIntervals(data.confidence);
    }

    displayWeatherSummary(summary) {
        const container = document.getElementById('weatherSummary');
        container.innerHTML = '';

        const weatherItems = [
            { key: '🌡️ Average Temperature (°C)', value: summary.temperature, unit: '°C' },
            { key: '🥵 Feels Like Temperature (°C)', value: summary.feels_like, unit: '°C' },
            { key: '☔ Probability of Rain (%)', value: summary.rain_probability, unit: '%' },
            { key: '❄️ Probability of Snow (%)', value: summary.snow_probability, unit: '%' },
            { key: '⚡ Probability of Storm (%)', value: summary.storm_probability, unit: '%' },
            { key: '🌤️ Sunshine Index (%)', value: summary.sunshine_index, unit: '%' },
            { key: '💧 Humidity Index (%)', value: summary.humidity_index, unit: '%' },
            { key: '💨 Wind Speed (m/s)', value: summary.wind_speed, unit: 'm/s' }
        ];

        weatherItems.forEach(item => {
            const weatherItem = document.createElement('div');
            weatherItem.className = 'weather-item fade-in';
            weatherItem.innerHTML = `
                <h3>${item.key}</h3>
                <div class="value">${item.value}</div>
                <div class="unit">${item.unit}</div>
            `;
            container.appendChild(weatherItem);
        });
    }

    displayVariablesTable(variables) {
        const container = document.getElementById('variablesTable');
        container.innerHTML = '';

        // Create header
        const headerRow = document.createElement('div');
        headerRow.className = 'variable-row';
        headerRow.style.fontWeight = '600';
        headerRow.style.backgroundColor = '#f8fafc';
        headerRow.innerHTML = `
            <div class="variable-name">Variable</div>
            <div class="variable-value">Predicted Value</div>
            <div class="variable-unit">Unit</div>
            <div class="variable-confidence">Confidence</div>
        `;
        container.appendChild(headerRow);

        // Add variables
        variables.forEach((variable, index) => {
            const row = document.createElement('div');
            row.className = 'variable-row fade-in';
            row.style.animationDelay = `${index * 0.05}s`;
            row.setAttribute('data-category', this.getVariableCategory(variable.name));
            
            const confidence = variable.confidence ? `${(variable.confidence * 100).toFixed(1)}%` : 'N/A';
            
            row.innerHTML = `
                <div class="variable-name">${variable.name}</div>
                <div class="variable-value">${variable.value.toFixed(3)}</div>
                <div class="variable-unit">${variable.unit || ''}</div>
                <div class="variable-confidence">${confidence}</div>
            `;
            container.appendChild(row);
        });
    }

    displayConfidenceIntervals(confidence) {
        const container = document.getElementById('confidenceSection');
        container.innerHTML = '';

        if (!confidence || confidence.length === 0) {
            container.innerHTML = '<p>Confidence intervals not available for this prediction.</p>';
            return;
        }

        // Show top 5 most confident predictions
        const topConfidence = confidence
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 5);

        topConfidence.forEach(item => {
            const confidenceItem = document.createElement('div');
            confidenceItem.className = 'confidence-item fade-in';
            confidenceItem.innerHTML = `
                <h4>${item.variable}</h4>
                <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${item.confidence * 100}%"></div>
                </div>
                <p>Confidence: ${(item.confidence * 100).toFixed(1)}%</p>
            `;
            container.appendChild(confidenceItem);
        });
    }


    filterVariables(searchTerm) {
        const rows = document.querySelectorAll('.variable-row');
        const term = searchTerm.toLowerCase();

        rows.forEach(row => {
            if (row.querySelector('.variable-name')) {
                const name = row.querySelector('.variable-name').textContent.toLowerCase();
                const matches = name.includes(term);
                row.style.display = matches ? 'grid' : 'none';
            }
        });
    }

    filterByCategory(category) {
        const rows = document.querySelectorAll('.variable-row');
        
        rows.forEach(row => {
            if (row.querySelector('.variable-name')) {
                const rowCategory = row.getAttribute('data-category');
                const matches = category === 'all' || rowCategory === category;
                row.style.display = matches ? 'grid' : 'none';
            }
        });
    }

    setActiveFilter(activeBtn) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        activeBtn.classList.add('active');
    }

    getVariableCategory(name) {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('temperature')) return 'temperature';
        if (lowerName.includes('moisture') || lowerName.includes('humidity')) return 'moisture';
        if (lowerName.includes('radiation') || lowerName.includes('flux')) return 'radiation';
        if (lowerName.includes('precipitation') || lowerName.includes('rain') || lowerName.includes('snow')) return 'precipitation';
        return 'other';
    }

    showLoading() {
        document.getElementById('loadingState').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loadingState').classList.add('hidden');
    }

    showResults() {
        document.getElementById('resultsSection').classList.remove('hidden');
    }

    hideResults() {
        document.getElementById('resultsSection').classList.add('hidden');
    }

    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorState').classList.remove('hidden');
    }

    hideError() {
        document.getElementById('errorState').classList.add('hidden');
    }

    // New Animation Methods
    initializeAnimations() {
        // Add intersection observer for scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                }
            });
        }, observerOptions);

        // Observe all cards
        document.querySelectorAll('.glass-card').forEach(card => {
            observer.observe(card);
        });
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            // Load saved theme or default to dark
            const savedTheme = localStorage.getItem('weather-oracle-theme') || 'dark';
            this.applyTheme(savedTheme);
            
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                this.applyTheme(newTheme);
                localStorage.setItem('weather-oracle-theme', newTheme);
            });
        }
    }

    applyTheme(theme) {
        const themeToggle = document.getElementById('themeToggle');
        const icon = themeToggle.querySelector('i');
        
        if (theme === 'light') {
            document.body.classList.add('light-theme');
            icon.className = 'fas fa-sun';
        } else {
            document.body.classList.remove('light-theme');
            icon.className = 'fas fa-moon';
        }
    }

    addParticleEffects() {
        // Add dynamic particle effects on mouse move
        document.addEventListener('mousemove', (e) => {
            this.createParticle(e.clientX, e.clientY);
        });
    }

    createParticle(x, y) {
        const particle = document.createElement('div');
        particle.style.position = 'fixed';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.width = '4px';
        particle.style.height = '4px';
        particle.style.background = 'var(--accent-primary)';
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '1000';
        particle.style.opacity = '0.6';
        particle.style.animation = 'particleFade 1s ease-out forwards';
        
        document.body.appendChild(particle);
        
        setTimeout(() => {
            particle.remove();
        }, 1000);
    }

    animateButtonClick(button) {
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 150);
    }

    animateFilterButton(button) {
        button.style.transform = 'scale(0.9)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 100);
    }

    animateCardHover(card, isEntering) {
        if (isEntering) {
            card.style.transform = 'translateY(-8px) scale(1.02)';
        } else {
            card.style.transform = 'translateY(0) scale(1)';
        }
    }

    smoothScrollToResults() {
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    // Location Management Methods
    initializeLocationFeatures() {
        this.initializeMap();
    }

    initializeMap() {
        if (typeof L !== 'undefined') {
            this.map = L.map('map').setView([40.7128, -74.0060], 10);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.map);

            // Add click handler for map
            this.map.on('click', (e) => {
                this.onMapClick(e.latlng);
            });

            // Add marker for selected location
            this.marker = L.marker([40.7128, -74.0060]).addTo(this.map);
        }
    }

    switchLocationTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.location-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Initialize map if switching to map tab
        if (tabName === 'map' && this.map) {
            setTimeout(() => {
                this.map.invalidateSize();
            }, 100);
        }
    }

    async loadCountries() {
        try {
            // Sample countries data - in a real app, this would come from an API
            this.countries = [
                { code: 'US', name: 'United States' },
                { code: 'CA', name: 'Canada' },
                { code: 'GB', name: 'United Kingdom' },
                { code: 'DE', name: 'Germany' },
                { code: 'FR', name: 'France' },
                { code: 'IT', name: 'Italy' },
                { code: 'ES', name: 'Spain' },
                { code: 'AU', name: 'Australia' },
                { code: 'JP', name: 'Japan' },
                { code: 'CN', name: 'China' },
                { code: 'IN', name: 'India' },
                { code: 'BR', name: 'Brazil' },
                { code: 'MX', name: 'Mexico' },
                { code: 'RU', name: 'Russia' },
                { code: 'ZA', name: 'South Africa' }
            ];

            const countrySelect = document.getElementById('countrySelect');
            countrySelect.innerHTML = '<option value="">Select Country</option>';
            
            this.countries.forEach(country => {
                const option = document.createElement('option');
                option.value = country.code;
                option.textContent = country.name;
                countrySelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading countries:', error);
        }
    }

    async onCountryChange(countryCode) {
        const regionSelect = document.getElementById('regionSelect');
        const citySelect = document.getElementById('citySelect');
        
        // Reset dependent selects
        regionSelect.innerHTML = '<option value="">Select Region</option>';
        citySelect.innerHTML = '<option value="">Select City</option>';
        regionSelect.disabled = true;
        citySelect.disabled = true;

        if (!countryCode) return;

        try {
            // Sample regions data - in a real app, this would come from an API
            const regionsData = {
                'US': ['California', 'New York', 'Texas', 'Florida', 'Illinois'],
                'CA': ['Ontario', 'Quebec', 'British Columbia', 'Alberta', 'Manitoba'],
                'GB': ['England', 'Scotland', 'Wales', 'Northern Ireland'],
                'DE': ['Bavaria', 'Baden-Württemberg', 'North Rhine-Westphalia', 'Lower Saxony'],
                'FR': ['Île-de-France', 'Auvergne-Rhône-Alpes', 'Occitanie', 'Nouvelle-Aquitaine'],
                'IT': ['Lombardy', 'Lazio', 'Campania', 'Sicily', 'Veneto'],
                'ES': ['Andalusia', 'Catalonia', 'Madrid', 'Valencia', 'Galicia'],
                'AU': ['New South Wales', 'Victoria', 'Queensland', 'Western Australia'],
                'JP': ['Tokyo', 'Osaka', 'Kyoto', 'Hokkaido', 'Fukuoka'],
                'CN': ['Beijing', 'Shanghai', 'Guangdong', 'Jiangsu', 'Zhejiang'],
                'IN': ['Maharashtra', 'Uttar Pradesh', 'Karnataka', 'Tamil Nadu', 'Gujarat'],
                'BR': ['São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Bahia', 'Paraná'],
                'MX': ['Mexico City', 'Jalisco', 'Nuevo León', 'Puebla', 'Veracruz'],
                'RU': ['Moscow', 'Saint Petersburg', 'Novosibirsk', 'Yekaterinburg'],
                'ZA': ['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape']
            };

            const regions = regionsData[countryCode] || [];
            regions.forEach(region => {
                const option = document.createElement('option');
                option.value = region;
                option.textContent = region;
                regionSelect.appendChild(option);
            });

            regionSelect.disabled = false;
        } catch (error) {
            console.error('Error loading regions:', error);
        }
    }

    async onRegionChange(regionName) {
        const citySelect = document.getElementById('citySelect');
        citySelect.innerHTML = '<option value="">Select City</option>';
        citySelect.disabled = true;

        if (!regionName) return;

        try {
            // Sample cities data - in a real app, this would come from an API
            const citiesData = {
                'California': ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento', 'San Jose'],
                'New York': ['New York City', 'Buffalo', 'Rochester', 'Syracuse', 'Albany'],
                'Texas': ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth'],
                'Florida': ['Miami', 'Tampa', 'Orlando', 'Jacksonville', 'Tallahassee'],
                'Illinois': ['Chicago', 'Aurora', 'Rockford', 'Joliet', 'Naperville'],
                'Ontario': ['Toronto', 'Ottawa', 'Hamilton', 'London', 'Kitchener'],
                'Quebec': ['Montreal', 'Quebec City', 'Laval', 'Gatineau', 'Longueuil'],
                'England': ['London', 'Birmingham', 'Manchester', 'Liverpool', 'Leeds'],
                'Scotland': ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee', 'Stirling'],
                'Bavaria': ['Munich', 'Nuremberg', 'Augsburg', 'Regensburg', 'Würzburg'],
                'Île-de-France': ['Paris', 'Boulogne-Billancourt', 'Saint-Denis', 'Argenteuil', 'Montreuil'],
                'Lombardy': ['Milan', 'Bergamo', 'Brescia', 'Monza', 'Como'],
                'Andalusia': ['Seville', 'Malaga', 'Cordoba', 'Granada', 'Cadiz'],
                'New South Wales': ['Sydney', 'Newcastle', 'Wollongong', 'Wagga Wagga', 'Albury'],
                'Tokyo': ['Tokyo', 'Yokohama', 'Kawasaki', 'Saitama', 'Chiba'],
                'Beijing': ['Beijing', 'Tianjin', 'Shijiazhuang', 'Tangshan', 'Baoding'],
                'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad'],
                'São Paulo': ['São Paulo', 'Guarulhos', 'Campinas', 'São Bernardo do Campo', 'Santo André'],
                'Mexico City': ['Mexico City', 'Iztapalapa', 'Gustavo A. Madero', 'Álvaro Obregón', 'Coyoacán'],
                'Moscow': ['Moscow', 'Zelenograd', 'Troitsk', 'Shcherbinka', 'Krasnogorsk'],
                'Gauteng': ['Johannesburg', 'Pretoria', 'Soweto', 'Benoni', 'Tembisa']
            };

            const cities = citiesData[regionName] || [];
            cities.forEach(city => {
                const option = document.createElement('option');
                option.value = city;
                option.textContent = city;
                citySelect.appendChild(option);
            });

            citySelect.disabled = false;
        } catch (error) {
            console.error('Error loading cities:', error);
        }
    }

    onCityChange(cityName) {
        if (!cityName) return;

        // In a real app, you would geocode the city name to get coordinates
        // For now, we'll use sample coordinates
        const sampleCoordinates = {
            'New York City': [40.7128, -74.0060],
            'Los Angeles': [34.0522, -118.2437],
            'Chicago': [41.8781, -87.6298],
            'Houston': [29.7604, -95.3698],
            'Phoenix': [33.4484, -112.0740],
            'Philadelphia': [39.9526, -75.1652],
            'San Antonio': [29.4241, -98.4936],
            'San Diego': [32.7157, -117.1611],
            'Dallas': [32.7767, -96.7970],
            'San Jose': [37.3382, -121.8863]
        };

        const coords = sampleCoordinates[cityName] || [40.7128, -74.0060];
        this.selectedLocation = {
            name: cityName,
            latitude: coords[0],
            longitude: coords[1]
        };

        this.updateMapLocation(coords[0], coords[1]);
        this.updateCoordinatesInput(coords[0], coords[1]);
    }

    updateLocationFromCoordinates() {
        const lat = parseFloat(document.getElementById('latitudeInput').value);
        const lng = parseFloat(document.getElementById('longitudeInput').value);

        if (!isNaN(lat) && !isNaN(lng)) {
            this.selectedLocation = {
                name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                latitude: lat,
                longitude: lng
            };

            this.updateMapLocation(lat, lng);
        }
    }

    updateMapLocation(lat, lng) {
        if (this.map && this.marker) {
            this.map.setView([lat, lng], 10);
            this.marker.setLatLng([lat, lng]);
        }
    }

    updateCoordinatesInput(lat, lng) {
        document.getElementById('latitudeInput').value = lat.toFixed(4);
        document.getElementById('longitudeInput').value = lng.toFixed(4);
    }

    onMapClick(latlng) {
        const lat = latlng.lat;
        const lng = latlng.lng;

        this.selectedLocation = {
            name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            latitude: lat,
            longitude: lng
        };

        this.updateMapLocation(lat, lng);
        this.updateCoordinatesInput(lat, lng);
        this.updateMapCoordinatesDisplay(lat, lng);
    }

    updateMapCoordinatesDisplay(lat, lng) {
        const coordsDisplay = document.getElementById('mapCoordinates');
        coordsDisplay.textContent = `Selected: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }

    getCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    this.selectedLocation = {
                        name: 'Current Location',
                        latitude: lat,
                        longitude: lng
                    };

                    this.updateMapLocation(lat, lng);
                    this.updateCoordinatesInput(lat, lng);
                    this.updateMapCoordinatesDisplay(lat, lng);
                },
                (error) => {
                    console.error('Error getting location:', error);
                    alert('Unable to get your current location. Please enter coordinates manually.');
                }
            );
        } else {
            alert('Geolocation is not supported by this browser.');
        }
    }

    centerMapOnLocation() {
        if (this.selectedLocation && this.map) {
            this.map.setView([this.selectedLocation.latitude, this.selectedLocation.longitude], 10);
        }
    }
}

// Add particle animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes particleFade {
        0% {
            opacity: 0.6;
            transform: scale(1);
        }
        100% {
            opacity: 0;
            transform: scale(0.5) translateY(-20px);
        }
    }
`;
document.head.appendChild(style);

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new WeatherOracle();
});

// Add some utility functions for better UX
function formatNumber(num, decimals = 2) {
    return parseFloat(num).toFixed(decimals);
}

function getWeatherIcon(condition) {
    const icons = {
        'sunny': '☀️',
        'cloudy': '☁️',
        'rainy': '🌧️',
        'snowy': '❄️',
        'stormy': '⛈️'
    };
    return icons[condition.toLowerCase()] || '🌤️';
}

// Add smooth scrolling for better UX
function smoothScrollTo(element) {
    element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}
