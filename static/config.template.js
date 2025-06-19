// API configuration template
// Copy this file to config.js and add your API keys
window.config = {
    // Alpha Vantage API configuration
    ALPHA_VANTAGE_API_KEY: 'PS7N6Y7CK2TQ5NLJ',
    // Company symbols mapping for Alpha Vantage
    COMPANY_SYMBOLS: {
        'Apple': 'AAPL',
        'Microsoft': 'MSFT',
        'Google': 'GOOGL',
        'Amazon': 'AMZN',
        'NVIDIA': 'NVDA',
        'AMD': 'AMD',
        'Intel': 'INTC',
        'TSMC': 'TSM',
        'Samsung': '005930.KS',
        'Dell': 'DELL',
        'HP': 'HPQ',
        'Lenovo': '0992.HK',
        'Oracle': 'ORCL',
        'SAP': 'SAP',
        'Salesforce': 'CRM',
        'OnePlus': null // Not publicly traded
    },
    // Mapping of regions to their coordinates for weather data
    REGION_COORDINATES: {
        'North America': { lat: 40.7128, lon: -74.0060 }, // New York coordinates as reference
        'South America': { lat: -23.5505, lon: -46.6333 }, // São Paulo coordinates
        'Europe': { lat: 51.5074, lon: -0.1278 }, // London coordinates
        'Asia': { lat: 31.2304, lon: 121.4737 }, // Shanghai coordinates
        'Africa': { lat: -26.2041, lon: 28.0473 }, // Johannesburg coordinates
        'Australia': { lat: -33.8688, lon: 151.2093 }, // Sydney coordinates
        'South Asia': { lat: 28.6139, lon: 77.2090 }, // Delhi coordinates
        'East Asia': { lat: 35.6762, lon: 139.6503 }, // Tokyo coordinates
        'Southeast Asia': { lat: 1.3521, lon: 103.8198 }, // Singapore coordinates
    }
};
