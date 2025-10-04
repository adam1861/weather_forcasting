// Environmental Prediction Dashboard JavaScript
class EnvironmentalDashboard {
    constructor() {
        this.apiBaseUrl = 'http://localhost:5000/api';
        this.currentData = null;
        this.charts = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setDefaultDate();
    }

    setupEventListeners() {
        // Predict button
        document.getElementById('predictBtn').addEventListener('click', () => {
            this.predictEnvironment();
        });

        // Retry button
        document.getElementById('retryBtn').addEventListener('click', () => {
            this.hideError();
            this.predictEnvironment();
        });

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterVariables(e.target.value);
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
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
    }

    setDefaultDate() {
        const today = new Date();
        const dateInput = document.getElementById('dateInput');
        dateInput.value = '2023-02-15'; // Default to a winter date
    }

    async predictEnvironment() {
        const date = document.getElementById('dateInput').value;
        if (!date) {
            this.showError('Please select a date');
            return;
        }

        this.showLoading();
        this.hideError();
        this.hideResults();

        try {
            const response = await fetch(`${this.apiBaseUrl}/predict`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ date: date })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.currentData = data;
            this.displayResults(data);
            this.hideLoading();
            this.showResults();

        } catch (error) {
            console.error('Prediction error:', error);
            this.hideLoading();
            this.showError('Failed to get predictions. Please make sure the API server is running.');
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
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new EnvironmentalDashboard();
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
