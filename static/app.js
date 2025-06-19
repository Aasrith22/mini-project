// Global variables to store data
let techData = null;
let agricultureData = null;

// Company data mapping
const companyData = {
    computers: ['Apple', 'Dell', 'HP', 'Lenovo'],
    smartphones: ['Apple', 'Samsung', 'Google', 'OnePlus'],
    semiconductors: ['Intel', 'AMD', 'NVIDIA', 'TSMC'],
    software: ['Microsoft', 'Oracle', 'SAP', 'Salesforce']
};

// Weather metrics mapping
const weatherMetrics = {
    temperature: '°C',
    rainfall: 'mm',
    humidity: '%',
    sunshine: 'hours'
};

// API endpoints
const API_ENDPOINTS = {
    tech: {
        stockData: 'https://www.alphavantage.co/query',
    },
    regions: 'https://api.example.com/regions' // Add the API endpoint for regions
};

// Only show metrics available from Alpha Vantage free API
const availableFinancialMetrics = [
    { value: 'stock_price', label: 'Stock Price' },
    { value: 'trading_volume', label: 'Trading Volume' },
    { value: 'volatility', label: 'Volatility' }
];

function updateFinancialMetricDropdown() {
    const metricSelect = document.getElementById('financialMetric');
    if (!metricSelect) return;
    metricSelect.innerHTML = '';
    availableFinancialMetrics.forEach(metric => {
        const option = document.createElement('option');
        option.value = metric.value;
        option.textContent = metric.label;
        metricSelect.appendChild(option);
    });
}

// Function to fetch data from API with authentication
async function fetchFromAPI(endpoint, params = {}) {
    try {
        const url = new URL(endpoint);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API fetch error:', error);
        return null;
    }
}

// Function to get weather data from OpenWeather
async function fetchWeatherData(lat, lon) {
    const params = {
        lat: lat,
        lon: lon,
        appid: window.config.OPENWEATHER_API_KEY,
        units: 'metric'
    };
    
    return await fetchFromAPI(API_ENDPOINTS.weather.data, params);
}

// Function to fetch historical weather data for the month
async function fetchMonthlyWeatherData(lat, lon, month, year) {
    const params = {
        lat: lat,
        lon: lon,
        appid: window.config.OPENWEATHER_API_KEY,
        units: 'metric',
        month: month,
        year: year
    };
    
    return await fetchFromAPI(API_ENDPOINTS.weather.data, params);
}

// Function to fetch tech data from backend
async function fetchTechData(category, company, metric) {
    try {
        const params = new URLSearchParams({
            category: category,
            company: company,
            metric: metric
        });
        const response = await fetch(`/api/tech/data?${params.toString()}`);
        
        // Try to parse JSON even if response is not OK
        let data = null;
        try {
            data = await response.json();
        } catch (e) {
            console.error('Failed to parse JSON response from backend:', e);
            // If JSON parsing fails, log the raw response text
            try {
                const text = await response.text();
                console.error('Raw backend response text:', text);
            } catch (e) {
                console.error('Also failed to get raw response text:', e);
            }
        }

        if (!response.ok) {
            console.error(`API fetch error: HTTP status ${response.status}`, data); // Log status and response data
            // If there's an error object in the response, throw that as the error
            if (data && data.error) {
                throw new Error(`API fetch error: ${response.status} - ${data.error}`);
            }
             throw new Error(`API fetch error: HTTP status ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('API fetch error:', error); // This catches network errors or the errors thrown above
        return null;
    }
}

// Function to populate both company dropdowns based on selected category
async function updateCompanyDropdowns(category) {
    const companySelect1 = document.getElementById('techCompany');
    const companySelect2 = document.getElementById('techCompany2');
    companySelect1.innerHTML = '<option value="">Select Company</option>';
    companySelect2.innerHTML = '<option value="">Select Company to Compare</option>';
    companySelect1.disabled = true;
    companySelect2.disabled = true;
    if (category) {
        try {
            const response = await fetch(`/api/tech/companies/${category}`);
            if (!response.ok) throw new Error('Failed to fetch companies');
            const companies = await response.json();
            Object.entries(companies).forEach(([symbol, name]) => {
                const option1 = document.createElement('option');
                option1.value = symbol;
                option1.textContent = name;
                companySelect1.appendChild(option1);
                const option2 = document.createElement('option');
                option2.value = symbol;
                option2.textContent = name;
                companySelect2.appendChild(option2);
            });
            companySelect1.disabled = false;
            companySelect2.disabled = false;
        } catch (err) {
            console.error('Error fetching companies:', err);
        }
    }
}

// Disable selected company in the other dropdown
function syncCompanyDropdowns() {
    const companySelect1 = document.getElementById('techCompany');
    const companySelect2 = document.getElementById('techCompany2');
    const selected1 = companySelect1.value;
    const selected2 = companySelect2.value;
    Array.from(companySelect2.options).forEach(opt => {
        opt.disabled = (opt.value === selected1 && opt.value !== '');
    });
    Array.from(companySelect1.options).forEach(opt => {
        opt.disabled = (opt.value === selected2 && opt.value !== '');
    });
}

// Function to populate crop dropdown from backend
async function updateCropDropdown() {
    const cropSelect = document.getElementById('crop');
    cropSelect.innerHTML = '<option value="">Select Crop</option>';
    cropSelect.disabled = true;
    try {
        const response = await fetch('/api/agriculture/crops');
        if (!response.ok) throw new Error('Failed to fetch crops');
        const crops = await response.json(); // Array of crop names
        crops.forEach(crop => {
            const option = document.createElement('option');
            option.value = crop;
            option.textContent = crop.charAt(0).toUpperCase() + crop.slice(1);
            cropSelect.appendChild(option);
        });
        cropSelect.disabled = false;
    } catch (err) {
        console.error('Error fetching crops:', err);
    }
}

// Update region dropdowns for agriculture to use new major city options
function updateRegionDropdown(cropValue) {
    const regionSelect = document.getElementById('region');
    if (!regionSelect) return;
    fetch(`/api/agriculture/regions/${encodeURIComponent(cropValue)}`)
        .then(res => res.json())
        .then(data => {
            regionSelect.innerHTML = '<option value="">Select Region</option>';
            (Array.isArray(data) ? data : (data.regions || [])).forEach(r => {
                const opt = document.createElement('option');
                opt.value = r;
                opt.textContent = r;
                regionSelect.appendChild(opt);
            });
        });
}

function updateRegion2Dropdown(cropValue) {
    const region2Select = document.getElementById('region2');
    if (!region2Select) return;
    fetch(`/api/agriculture/regions/${encodeURIComponent(cropValue)}`)
        .then(res => res.json())
        .then(data => {
            region2Select.innerHTML = '<option value="">Select Region to Compare</option>';
            (Array.isArray(data) ? data : (data.regions || [])).forEach(r => {
                const opt = document.createElement('option');
                opt.value = r;
                opt.textContent = r;
                region2Select.appendChild(opt);
            });
        });
}

function updateRegionMetricsDropdown(cropValue) {
    const regionMetricsSelect = document.getElementById('regionMetrics');
    if (!regionMetricsSelect) return;
    fetch(`/api/agriculture/regions/${encodeURIComponent(cropValue)}`)
        .then(res => res.json())
        .then(data => {
            regionMetricsSelect.innerHTML = '<option value="">Select Region</option>';
            (Array.isArray(data) ? data : (data.regions || [])).forEach(r => {
                const opt = document.createElement('option');
                opt.value = r;
                opt.textContent = r;
                regionMetricsSelect.appendChild(opt);
            });
        });
}

// On crop change, update all region dropdowns
const cropSelect = document.getElementById('crop');
if (cropSelect) {
    cropSelect.addEventListener('change', function() {
        updateRegionDropdown(this.value);
        updateRegion2Dropdown(this.value);
    });
}
const cropMetricsSelect = document.getElementById('cropMetrics');
if (cropMetricsSelect) {
    cropMetricsSelect.addEventListener('change', function() {
        updateRegionMetricsDropdown(this.value);
    });
}

// Function to process monthly weather data
function processMonthlyWeatherData(data) {
    const monthlyData = {};
    data.forEach(entry => {
        const date = new Date(entry.date);
        const month = date.getMonth();
        const year = date.getFullYear();
        const key = `${year}-${month}`;
        
        if (!monthlyData[key]) {
            monthlyData[key] = { temperature: 0, rainfall: 0, count: 0 };
        }
        monthlyData[key].temperature += entry.temperature;
        monthlyData[key].rainfall += entry.rainfall;
        monthlyData[key].count++;
    });
    
    // Calculate averages
    return Object.entries(monthlyData).map(([key, values]) => ({
        date: key,
        averageTemperature: values.temperature / values.count,
        totalRainfall: values.rainfall
    }));
}

// Function to update tech visualization with real data
async function updateTechVisualization() {
    const mode = document.getElementById('correlationMode').value;
    if (mode === 'companies') {
        const company1 = document.getElementById('techCompany').value;
        const company2 = document.getElementById('techCompany2').value;
        const metric = document.getElementById('financialMetric').value;
        const category = document.getElementById('techCategory').value;
        if (!company1 || !company2 || !metric || !category) return;
        try {
            const [data1, data2] = await Promise.all([
                fetchTechData(category, company1, metric),
                fetchTechData(category, company2, metric)
            ]);
            window.techData1 = data1;
            window.techData2 = data2;
            if (data1 && Array.isArray(data1) && data1.length > 0) {
                createVisualization(
                    data1,
                    'techVisualization',
                    `${company1} ${metric.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
                    metric,
                    metric === 'stock_price' ? 'Price (USD)' :
                    metric === 'market_cap' ? 'Market Cap (USD)' :
                    metric === 'trading_volume' ? 'Volume' :
                    metric === 'volatility' ? 'Volatility' : 'Value'
                );
            } else {
                document.getElementById('techVisualization').innerHTML = 
                    '<div class="alert alert-warning">No data available for visualization</div>';
            }
        } catch (error) {
            console.error('Error updating tech visualization:', error);
            document.getElementById('techVisualization').innerHTML = 
                '<div class="alert alert-warning">Error fetching data</div>';
        }
    } else {
        // Metrics mode
        const company = document.getElementById('techCompanyMetrics').value;
        const metric1 = document.getElementById('financialMetric1').value;
        const metric2 = document.getElementById('financialMetric2').value;
        const category = document.getElementById('techCategory').value;
        if (!company || !metric1 || !metric2 || !category || metric1 === metric2) return;
        try {
            const data = await fetchTechData(category, company, metric1);
            window.techData1 = data;
            window.techMetric1 = metric1;
            window.techMetric2 = metric2;
            // Show time series for metric1 by default
            if (data && Array.isArray(data) && data.length > 0) {
                createVisualization(
                    data,
                    'techVisualization',
                    `${company} ${metric1.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
                    metric1,
                    metric1 === 'stock_price' ? 'Price (USD)' :
                    metric1 === 'market_cap' ? 'Market Cap (USD)' :
                    metric1 === 'trading_volume' ? 'Volume' :
                    metric1 === 'volatility' ? 'Volatility' : 'Value'
                );
            } else {
                document.getElementById('techVisualization').innerHTML = 
                    '<div class="alert alert-warning">No data available for visualization</div>';
            }
        } catch (error) {
            console.error('Error updating tech visualization:', error);
            document.getElementById('techVisualization').innerHTML = 
                '<div class="alert alert-warning">Error fetching data</div>';
        }
    }
}

// Update available weather metrics to match Open-Meteo
const availableWeatherMetrics = [
    { value: 'temperature', label: 'Temperature (°C)' },
    { value: 'rainfall', label: 'Rainfall (mm)' },
    { value: 'humidity', label: 'Humidity (%)' }
];

function updateWeatherMetricDropdowns() {
    const weatherMetric = document.getElementById('weatherMetric');
    const weatherMetric1 = document.getElementById('weatherMetric1');
    const weatherMetric2 = document.getElementById('weatherMetric2');
    [weatherMetric, weatherMetric1, weatherMetric2].forEach(select => {
        if (select) {
            select.innerHTML = '';
            availableWeatherMetrics.forEach(metric => {
                const option = document.createElement('option');
                option.value = metric.value;
                option.textContent = metric.label;
                select.appendChild(option);
            });
        }
    });
}

// Call this on DOMContentLoaded
updateWeatherMetricDropdowns();

// Update visualization logic for agriculture
async function updateAgricultureVisualization() {
    const region = document.getElementById('region').value;
    const metric = document.getElementById('weatherMetric').value;
    const crop = document.getElementById('crop').value;
    if (!region || !metric || !crop) return;
    try {
        const resp = await fetch(`/api/agriculture/timeseries?crop=${encodeURIComponent(crop)}&region=${encodeURIComponent(region)}&metric=${encodeURIComponent(metric)}`);
        const data = await resp.json();
        if (data.error) {
            document.getElementById('agricultureVisualization').innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
            return;
        }
        // Plot weather metric and production if available
        const traces = [];
        traces.push({
            x: data.dates,
            y: data.values,
            name: metric.charAt(0).toUpperCase() + metric.slice(1),
            type: 'scatter',
            mode: 'lines+markers',
            yaxis: 'y1'
        });
        if (data.production && data.production.some(v => v !== null)) {
            traces.push({
                x: data.dates,
                y: data.production,
                name: 'Production',
                type: 'scatter',
                mode: 'lines+markers',
                yaxis: 'y2'
            });
        }
        const layout = {
            title: `${metric} and production for ${region}`,
            xaxis: { title: 'Year' },
            yaxis: { title: metric.charAt(0).toUpperCase() + metric.slice(1), side: 'left' },
            yaxis2: data.production && data.production.some(v => v !== null) ? {
                title: 'Production',
                overlaying: 'y',
                side: 'right'
            } : undefined
        };
        Plotly.newPlot('agricultureVisualization', traces, layout);
        if (data.warning) {
            document.getElementById('agricultureVisualization').innerHTML += `<div class="alert alert-warning">${data.warning}</div>`;
        }
    } catch (error) {
        document.getElementById('agricultureVisualization').innerHTML = `<div class="alert alert-danger">Error loading data</div>`;
    }
}

// Function to validate tech selections
function validateTechSelections() {
    const mode = document.getElementById('correlationMode').value;
    const analyzeBtn = document.getElementById('analyzeTech');
    if (mode === 'companies') {
        const category = document.getElementById('techCategory').value;
        const company1 = document.getElementById('techCompany').value;
        const company2 = document.getElementById('techCompany2').value;
        const metric = document.getElementById('financialMetric').value;
        analyzeBtn.disabled = !(category && company1 && company2 && metric);
    } else {
        const category = document.getElementById('techCategory').value;
        const company = document.getElementById('techCompanyMetrics').value;
        const metric1 = document.getElementById('financialMetric1').value;
        const metric2 = document.getElementById('financialMetric2').value;
        analyzeBtn.disabled = !(category && company && metric1 && metric2 && metric1 !== metric2);
    }
}

// Function to validate agriculture selections
function validateAgricultureSelections() {
    const crop = document.getElementById('crop').value;
    const region = document.getElementById('region').value;
    const metric = document.getElementById('weatherMetric').value;
    const analyzeBtn = document.getElementById('analyzeAgriculture');

    analyzeBtn.disabled = !(crop && region && metric);
}

// Function to create a visualization
function createVisualization(data, containerId, title, selectedMetric, yAxisLabel) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!data || data.length === 0) {
        container.innerHTML = '<div class="alert alert-warning">No data available for visualization</div>';
        return;
    }

    const traces = [{
        x: data.map(item => item.date),
        y: data.map(item => item[selectedMetric]),
        name: data[0].name,
        type: 'scatter',
        mode: 'lines+markers',
        line: {
            width: 2,
            color: '#4a90e2'
        },
        marker: {
            size: 6,
            color: '#4a90e2'
        }
    }];

    const layout = {
        title: {
            text: title,
            font: { size: 24 }
        },
        xaxis: { 
            title: 'Date',
            tickangle: -45,
            gridcolor: '#E1E1E1',
            showgrid: true
        },
        yaxis: { 
            title: yAxisLabel,
            gridcolor: '#E1E1E1',
            showgrid: true
        },
        showlegend: true,
        legend: { 
            orientation: 'h', 
            y: -0.2 
        },
        plot_bgcolor: '#FFFFFF',
        paper_bgcolor: '#FFFFFF',
        hovermode: 'closest',
        margin: { t: 50, b: 100, l: 60, r: 40 }
    };

    const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d']
    };

    Plotly.newPlot(containerId, traces, layout, config);
}

// Function to generate sample tech data
function generateTechData(category, company, metric) {
    const data = [];
    const today = new Date();
    const numDays = 30;
    let baseValue = Math.random() * 100 + 50;
    
    for (let i = 0; i < numDays; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (numDays - i));
        
        const randomChange = (Math.random() - 0.5) * 5;
        baseValue += randomChange;
        
        const dataPoint = {
            date: date.toISOString().split('T')[0],
            name: company,
            category: category
        };

        switch(metric) {
            case 'stock_price':
                dataPoint[metric] = baseValue;
                break;
            case 'market_cap':
                dataPoint[metric] = baseValue * 1000000;
                break;
            case 'trading_volume':
                dataPoint[metric] = Math.round(baseValue * 10000);
                break;
            case 'volatility':
                dataPoint[metric] = Math.abs(randomChange);
                break;
        }
        
        data.push(dataPoint);
    }
    
    return data;
}

// Function to generate sample agriculture data
function generateAgricultureData(crop, region, metric) {
    const data = [];
    const today = new Date();
    const numDays = 30;
    let baseValue;
    
    // Set appropriate base values for different metrics
    switch(metric) {
        case 'temperature':
            baseValue = 25; // Average temperature in Celsius
            break;
        case 'rainfall':
            baseValue = 50; // Average rainfall in mm
            break;
        case 'humidity':
            baseValue = 65; // Average humidity percentage
            break;
        case 'sunshine':
            baseValue = 8; // Average sunshine hours
            break;
    }
    
    for (let i = 0; i < numDays; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (numDays - i));
        
        // Add seasonal variation
        const seasonalFactor = Math.sin((i / numDays) * Math.PI * 2);
        const randomVariation = (Math.random() - 0.5) * 2;
        let value = baseValue + (seasonalFactor * 5) + randomVariation;
        
        // Ensure values stay within realistic ranges
        switch(metric) {
            case 'temperature':
                value = Math.max(10, Math.min(40, value));
                break;
            case 'rainfall':
                value = Math.max(0, value);
                break;
            case 'humidity':
                value = Math.max(30, Math.min(100, value));
                break;
            case 'sunshine':
                value = Math.max(0, Math.min(12, value));
                break;
        }
        
        data.push({
            date: date.toISOString().split('T')[0],
            name: `${crop} in ${region}`,
            crop: crop,
            region: region,
            [metric]: value
        });
    }
    
    return data;
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    updateFinancialMetricDropdown();
    // Tech & Finance event listeners
    const techCategory = document.getElementById('techCategory');
    const techCompany = document.getElementById('techCompany');
    const techCompany2 = document.getElementById('techCompany2');
    const financialMetric = document.getElementById('financialMetric');
    const analyzeTechBtn = document.getElementById('analyzeTech');
    
    if (techCategory) {
        techCategory.addEventListener('change', async function() {
            await updateCompanyDropdowns(this.value);
            await updateMetricsCompanyDropdown(this.value);
            syncCompanyDropdowns();
            validateTechSelections();
        });
    }
    
    if (techCompany) {
        techCompany.addEventListener('change', function() {
            syncCompanyDropdowns();
            validateTechSelections();
        });
    }
    
    if (techCompany2) {
        techCompany2.addEventListener('change', function() {
            syncCompanyDropdowns();
            validateTechSelections();
        });
    }
    
    if (financialMetric) {
        financialMetric.addEventListener('change', validateTechSelections);
    }
    
    if (analyzeTechBtn) {
        analyzeTechBtn.addEventListener('click', updateTechVisualization);
    }
    
    // Agriculture & Weather event listeners
    const cropSelect = document.getElementById('crop');
    const regionSelect = document.getElementById('region');
    const weatherMetric = document.getElementById('weatherMetric');
    const analyzeAgricultureBtn = document.getElementById('analyzeAgriculture');
    
    if (cropSelect) {
        cropSelect.addEventListener('change', async function() {
            await updateRegionDropdown(this.value);
            validateAgricultureSelections();
        });
        // Populate crops from backend on load
        updateCropDropdown();
    }
    
    if (regionSelect) {
        regionSelect.addEventListener('change', validateAgricultureSelections);
    }
    
    if (weatherMetric) {
        weatherMetric.addEventListener('change', validateAgricultureSelections);
    }
    
    if (analyzeAgricultureBtn) {
        analyzeAgricultureBtn.addEventListener('click', updateAgricultureVisualization);
    }

    setupTechVizTabs();
    setupCorrelationModeUI();
});

// Test function to check API connectivity
async function testAPIs() {
    console.log('Testing API connectivity...');
    
    // Test backend /api/tech/data endpoint
    try {
        console.log('Testing backend /api/tech/data endpoint...');
        const testCategory = 'smartphones';
        const testCompany = '005930.KS'; // Samsung symbol
        const testMetric = 'stock_price';
        const params = new URLSearchParams({
            category: testCategory,
            company: testCompany,
            metric: testMetric
        });
        const response = await fetch(`/api/tech/data?${params.toString()}`);
        const techData = await response.json();
        if (Array.isArray(techData) && techData.length > 0) {
            console.log('✅ Backend /api/tech/data is working!');
            console.log('Sample data:', techData.slice(0, 3));
        } else {
            console.error('❌ Backend /api/tech/data returned no data. Check your backend and API keys.');
            console.log('Response:', techData);
        }
    } catch (error) {
        console.error('❌ Backend /api/tech/data error:', error);
    }

    // Test OpenWeather API
    try {
        console.log('Testing OpenWeather API...');
        const testCoords = { lat: 40.7128, lon: -74.0060 }; // New York coordinates
        const weatherData = await fetchWeatherData(testCoords.lat, testCoords.lon);
        if (weatherData && weatherData.main) {
            console.log('✅ OpenWeather API is working!');
            console.log('Sample data:', {
                temperature: weatherData.main.temp,
                humidity: weatherData.main.humidity
            });
        } else {
            console.error('❌ OpenWeather API returned no data. Check your API key.');
            console.log('Response:', weatherData);
        }
    } catch (error) {
        console.error('❌ OpenWeather API error:', error);
    }
}

// Add test function to window object so it can be called from console
window.testAPIs = testAPIs;

// Helper: fetch correlation data from backend
async function fetchCorrelationData(dataset1, dataset2) {
    try {
        const response = await fetch('/api/data/correlation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataset1, dataset2 })
        });
        return await response.json();
    } catch (error) {
        console.error('Error fetching correlation data:', error);
        return null;
    }
}

// Render correlation scatter plot and value
async function renderTechCorrelation() {
    const mode = document.getElementById('correlationMode').value;
    if (mode === 'companies') {
        const data1 = window.techData1 || [];
        const data2 = window.techData2 || [];
        const metric = document.getElementById('financialMetric').value;
        if (!data1.length || !data2.length) {
            document.getElementById('techCorrelationPlot').innerHTML = '<div class="alert alert-warning">No data available for correlation plot</div>';
            document.getElementById('techCorrelationValue').innerText = '';
            return;
        }
        // Merge on date
        const data2ByDate = Object.fromEntries(data2.map(d => [d.date, d]));
        const points = data1.map(d => {
            const d2 = data2ByDate[d.date];
            return d2 ? { x: d[metric], y: d2[metric], date: d.date } : null;
        }).filter(Boolean);
        if (!points.length) {
            document.getElementById('techCorrelationPlot').innerHTML = '<div class="alert alert-warning">No overlapping dates for correlation</div>';
            document.getElementById('techCorrelationValue').innerText = '';
            return;
        }
        Plotly.newPlot('techCorrelationPlot', [{
            x: points.map(p => p.x),
            y: points.map(p => p.y),
            text: points.map(p => p.date),
            mode: 'markers',
            type: 'scatter',
            marker: { color: '#1DB954', size: 10 },
            name: 'Correlation'
        }], {
            title: `${document.getElementById('techCompany').selectedOptions[0].text} vs ${document.getElementById('techCompany2').selectedOptions[0].text} (${metric.replace('_', ' ')})`,
            xaxis: { title: document.getElementById('techCompany').selectedOptions[0].text },
            yaxis: { title: document.getElementById('techCompany2').selectedOptions[0].text },
            plot_bgcolor: '#fff',
            paper_bgcolor: '#fff',
        });
        // Calculate Pearson correlation
        const n = points.length;
        const meanX = points.reduce((a, b) => a + b.x, 0) / n;
        const meanY = points.reduce((a, b) => a + b.y, 0) / n;
        const numerator = points.reduce((sum, p) => sum + (p.x - meanX) * (p.y - meanY), 0);
        const denomX = Math.sqrt(points.reduce((sum, p) => sum + Math.pow(p.x - meanX, 2), 0));
        const denomY = Math.sqrt(points.reduce((sum, p) => sum + Math.pow(p.y - meanY, 2), 0));
        const r = denomX && denomY ? numerator / (denomX * denomY) : 0;
        document.getElementById('techCorrelationValue').innerText = `Pearson correlation: ${r.toFixed(3)}`;
    } else {
        // Metrics mode
        const data = window.techData1 || [];
        const metric1 = window.techMetric1;
        const metric2 = window.techMetric2;
        if (!data.length || !metric1 || !metric2) {
            document.getElementById('techCorrelationPlot').innerHTML = '<div class="alert alert-warning">No data available for correlation plot</div>';
            document.getElementById('techCorrelationValue').innerText = '';
            return;
        }
        const points = data.map(d => {
            if (d[metric1] !== undefined && d[metric2] !== undefined) {
                return { x: d[metric1], y: d[metric2], date: d.date };
            }
            return null;
        }).filter(Boolean);
        if (!points.length) {
            document.getElementById('techCorrelationPlot').innerHTML = '<div class="alert alert-warning">No overlapping data for correlation</div>';
            document.getElementById('techCorrelationValue').innerText = '';
            return;
        }
        Plotly.newPlot('techCorrelationPlot', [{
            x: points.map(p => p.x),
            y: points.map(p => p.y),
            text: points.map(p => p.date),
            mode: 'markers',
            type: 'scatter',
            marker: { color: '#1DB954', size: 10 },
            name: 'Correlation'
        }], {
            title: `${document.getElementById('techCompanyMetrics').selectedOptions[0].text}: ${metric1.replace('_', ' ')} vs ${metric2.replace('_', ' ')}`,
            xaxis: { title: metric1.replace('_', ' ') },
            yaxis: { title: metric2.replace('_', ' ') },
            plot_bgcolor: '#fff',
            paper_bgcolor: '#fff',
        });
        // Calculate Pearson correlation
        const n = points.length;
        const meanX = points.reduce((a, b) => a + b.x, 0) / n;
        const meanY = points.reduce((a, b) => a + b.y, 0) / n;
        const numerator = points.reduce((sum, p) => sum + (p.x - meanX) * (p.y - meanY), 0);
        const denomX = Math.sqrt(points.reduce((sum, p) => sum + Math.pow(p.x - meanX, 2), 0));
        const denomY = Math.sqrt(points.reduce((sum, p) => sum + Math.pow(p.y - meanY, 2), 0));
        const r = denomX && denomY ? numerator / (denomX * denomY) : 0;
        document.getElementById('techCorrelationValue').innerText = `Pearson correlation: ${r.toFixed(3)}`;
    }
}

// Tab switching logic for mini slider
function setupTechVizTabs() {
    const timeseriesTab = document.getElementById('timeseries-tab');
    const correlationTab = document.getElementById('correlation-tab');
    if (correlationTab) {
        correlationTab.addEventListener('shown.bs.tab', function () {
            renderTechCorrelation();
        });
    }
}

// Show/hide form groups based on correlation mode (dropdown version)
function setupCorrelationModeUI() {
    const modeDropdown = document.getElementById('correlationMode');
    const companiesGroup = document.getElementById('correlateCompaniesGroup');
    const metricsGroup = document.getElementById('correlateMetricsGroup');
    modeDropdown.addEventListener('change', function() {
        if (this.value === 'companies') {
            companiesGroup.style.display = '';
            metricsGroup.style.display = 'none';
        } else {
            companiesGroup.style.display = 'none';
            metricsGroup.style.display = '';
        }
        validateTechSelections();
    });
}

// Populate metrics mode company dropdown
async function updateMetricsCompanyDropdown(category) {
    const companySelect = document.getElementById('techCompanyMetrics');
    companySelect.innerHTML = '<option value="">Select Company</option>';
    companySelect.disabled = true;
    if (category) {
        try {
            const response = await fetch(`/api/tech/companies/${category}`);
            if (!response.ok) throw new Error('Failed to fetch companies');
            const companies = await response.json();
            Object.entries(companies).forEach(([symbol, name]) => {
                const option = document.createElement('option');
                option.value = symbol;
                option.textContent = name;
                companySelect.appendChild(option);
            });
            companySelect.disabled = false;
        } catch (err) {
            console.error('Error fetching companies:', err);
        }
    }
}

// --- Agriculture Correlation Mode Logic ---
const agriCorrelationMode = document.getElementById('agriCorrelationMode');
const correlateRegionsGroup = document.getElementById('correlateRegionsGroup');
const correlateWeatherMetricsGroup = document.getElementById('correlateWeatherMetricsGroup');

agriCorrelationMode.addEventListener('change', function() {
    if (this.value === 'regions') {
        correlateRegionsGroup.style.display = '';
        correlateWeatherMetricsGroup.style.display = 'none';
    } else {
        correlateRegionsGroup.style.display = 'none';
        correlateWeatherMetricsGroup.style.display = '';
    }
});

// --- Populate region dropdowns dynamically based on crop selection ---
const crop = document.getElementById('crop');
const region = document.getElementById('region');
const region2 = document.getElementById('region2');
const cropMetrics = document.getElementById('cropMetrics');
const regionMetrics = document.getElementById('regionMetrics');

function populateRegions(cropValue, regionSelect) {
    // Fetch regions for the selected crop from backend
    fetch(`/api/agriculture/regions/${encodeURIComponent(cropValue)}`)
        .then(res => res.json())
        .then(data => {
            regionSelect.innerHTML = '<option value="">Select Region</option>';
            (Array.isArray(data) ? data : (data.regions || [])).forEach(r => {
                const opt = document.createElement('option');
                opt.value = r;
                opt.textContent = r;
                regionSelect.appendChild(opt);
            });
        });
}

crop.addEventListener('change', () => {
    populateRegions(crop.value, region);
    populateRegions(crop.value, region2);
});
cropMetrics.addEventListener('change', () => {
    populateRegions(cropMetrics.value, regionMetrics);
});

// --- Agriculture Visualization Tabs ---
const agriVizTabs = document.getElementById('agriVizTabs');
const agriTimeseriesPane = document.getElementById('agri-timeseries-pane');
const agriCorrelationPane = document.getElementById('agri-correlation-pane');

// --- Analyze Button Logic ---
const analyzeAgriculture = document.getElementById('analyzeAgriculture');
const agricultureVisualization = document.getElementById('agricultureVisualization');
const agriCorrelationPlot = document.getElementById('agriCorrelationPlot');
const agriCorrelationValue = document.getElementById('agriCorrelationValue');

analyzeAgriculture.addEventListener('click', () => {
    const mode = agriCorrelationMode.value;
    if (mode === 'regions') {
        // Correlate same weather metric for two regions
        const cropVal = crop.value;
        const region1 = region.value;
        const region2Val = region2.value;
        const metric = document.getElementById('weatherMetric').value;
        if (!cropVal || !region1 || !region2Val || !metric) {
            alert('Please select crop, both regions, and weather metric.');
            return;
        }
        // Fetch time series for both regions
        fetch(`/api/agriculture/timeseries?crop=${encodeURIComponent(cropVal)}&region=${encodeURIComponent(region1)}&metric=${encodeURIComponent(metric)}`)
            .then(res => res.json())
            .then(data1 => {
                fetch(`/api/agriculture/timeseries?crop=${encodeURIComponent(cropVal)}&region=${encodeURIComponent(region2Val)}&metric=${encodeURIComponent(metric)}`)
                    .then(res => res.json())
                    .then(data2 => {
                        // Plot time series (region1)
                        Plotly.newPlot(agricultureVisualization, [{
                            x: data1.dates,
                            y: data1.values,
                            name: region1,
                            type: 'scatter',
                            mode: 'lines+markers'
                        }, {
                            x: data2.dates,
                            y: data2.values,
                            name: region2Val,
                            type: 'scatter',
                            mode: 'lines+markers'
                        }], {
                            title: `${metric} for ${region1} and ${region2Val}`,
                            xaxis: { title: 'Date' },
                            yaxis: { title: metric }
                        });
                        // Correlation scatter plot
                        fetch(`/api/agriculture/correlation?mode=regions&crop=${encodeURIComponent(cropVal)}&region1=${encodeURIComponent(region1)}&region2=${encodeURIComponent(region2Val)}&metric=${encodeURIComponent(metric)}`)
                            .then(res => res.json())
                            .then(corrData => {
                                Plotly.newPlot(agriCorrelationPlot, [{
                                    x: corrData.x,
                                    y: corrData.y,
                                    mode: 'markers',
                                    type: 'scatter',
                                    name: `${region1} vs ${region2Val}`
                                }], {
                                    title: `Correlation: ${metric} (${region1} vs ${region2Val})`,
                                    xaxis: { title: `${region1} ${metric}` },
                                    yaxis: { title: `${region2Val} ${metric}` }
                                });
                                agriCorrelationValue.textContent = `Pearson r: ${corrData.pearson.toFixed(3)}`;
                            });
                    });
            });
    } else {
        // Correlate two weather metrics for the same region
        const cropVal = cropMetrics.value;
        const regionVal = regionMetrics.value;
        const metric1 = document.getElementById('weatherMetric1').value;
        const metric2 = document.getElementById('weatherMetric2').value;
        if (!cropVal || !regionVal || !metric1 || !metric2) {
            alert('Please select crop, region, and both weather metrics.');
            return;
        }
        // Fetch time series for both metrics
        fetch(`/api/agriculture/timeseries?crop=${encodeURIComponent(cropVal)}&region=${encodeURIComponent(regionVal)}&metric=${encodeURIComponent(metric1)}`)
            .then(res => res.json())
            .then(data1 => {
                fetch(`/api/agriculture/timeseries?crop=${encodeURIComponent(cropVal)}&region=${encodeURIComponent(regionVal)}&metric=${encodeURIComponent(metric2)}`)
                    .then(res => res.json())
                    .then(data2 => {
                        // Plot time series (metric1)
                        Plotly.newPlot(agricultureVisualization, [{
                            x: data1.dates,
                            y: data1.values,
                            name: metric1,
                            type: 'scatter',
                            mode: 'lines+markers'
                        }, {
                            x: data2.dates,
                            y: data2.values,
                            name: metric2,
                            type: 'scatter',
                            mode: 'lines+markers'
                        }], {
                            title: `${metric1} and ${metric2} for ${regionVal}`,
                            xaxis: { title: 'Date' },
                            yaxis: { title: 'Value' }
                        });
                        // Correlation scatter plot
                        fetch(`/api/agriculture/correlation?mode=metrics&crop=${encodeURIComponent(cropVal)}&region=${encodeURIComponent(regionVal)}&metric1=${encodeURIComponent(metric1)}&metric2=${encodeURIComponent(metric2)}`)
                            .then(res => res.json())
                            .then(corrData => {
                                Plotly.newPlot(agriCorrelationPlot, [{
                                    x: corrData.x,
                                    y: corrData.y,
                                    mode: 'markers',
                                    type: 'scatter',
                                    name: `${metric1} vs ${metric2}`
                                }], {
                                    title: `Correlation: ${metric1} vs ${metric2} (${regionVal})`,
                                    xaxis: { title: metric1 },
                                    yaxis: { title: metric2 }
                                });
                                agriCorrelationValue.textContent = `Pearson r: ${corrData.pearson.toFixed(3)}`;
                            });
                    });
            });
    }
});

// --- End Agriculture Correlation Logic ---
