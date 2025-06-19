from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import requests
from dotenv import load_dotenv
import yfinance as yf
import json
import logging


logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

load_dotenv()

app = Flask(__name__, static_folder='static', static_url_path='/static')
CORS(app)

# API Keys
OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY')
ALPHA_VANTAGE_API_KEY = os.getenv('ALPHA_VANTAGE_API_KEY')

# Log masked API key to confirm it's loaded
if ALPHA_VANTAGE_API_KEY:
    logger.debug(f"Alpha Vantage API Key loaded (masked): {ALPHA_VANTAGE_API_KEY[:4]}...{ALPHA_VANTAGE_API_KEY[-4:]}")
else:
    logger.error("Alpha Vantage API Key not loaded. Check .env file.")

# Tech companies categorized by sector
TECH_COMPANIES = {
    'computers': {
        'AAPL': 'Apple Inc.',
        'HPQ': 'HP Inc.',
        'DELL': 'Dell Technologies',
        'LNVGY': 'Lenovo Group'
    },
    'smartphones': {
        'AAPL': 'Apple Inc.',
        'SSNLF': 'Samsung Electronics',
        'GOOGL': 'Google (Pixel)',
        'XIACF': 'Xiaomi'
    },
    'semiconductors': {
        'NVDA': 'NVIDIA Corporation',
        'AMD': 'Advanced Micro Devices',
        'INTC': 'Intel Corporation',
        'TSM': 'Taiwan Semiconductor'
    },
    'software': {
        'MSFT': 'Microsoft Corporation',
        'ORCL': 'Oracle Corporation',
        'CRM': 'Salesforce',
        'ADBE': 'Adobe Inc.'
    }
}

# Agricultural regions and crops
AGRICULTURAL_REGIONS = {
    'wheat': ['US Plains', 'Canadian Prairies', 'Russian Steppes', 'Australian Wheatbelt'],
    'rice': ['Indo-Gangetic Plains', 'Yangtze Basin', 'Mekong Delta', 'Sacramento Valley'],
    'corn': ['US Corn Belt', 'Brazilian Cerrado', 'Mexican Highlands', 'South African Maize Triangle'],
    'soybeans': ['US Midwest', 'Brazilian Pampas', 'Argentine Pampas', 'Chinese Northeast']
}

class DataStore:
    def __init__(self):
        self.weather_data = []
        self.financial_data = []
        self.health_data = []
        self.tech_data = []
        self.agriculture_data = []

data_store = DataStore()

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/weather', methods=['GET'])
def get_weather_data():
    try:
        logger.info("Fetching weather data...")
        city = request.args.get('city', 'London')
        logger.debug(f"City: {city}")
        
        # Get current weather
        current_url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={OPENWEATHER_API_KEY}&units=metric"
        logger.debug(f"Fetching current weather from: {current_url}")
        response = requests.get(current_url)
        response.raise_for_status()  # Raise an exception for bad status codes
        current_data = response.json()
        logger.debug(f"Current weather response: {current_data}")
        
        if 'coord' not in current_data:
            logger.error(f"Invalid response from OpenWeather API: {current_data}")
            return jsonify({"error": "Invalid response from weather API"}), 500
        
        lat = current_data['coord']['lat']
        lon = current_data['coord']['lon']
        
        data = []
        # Get only 5 days of historical data to avoid rate limiting
        for i in range(5):
            date = datetime.now() - timedelta(days=i)
            timestamp = int(date.timestamp())
            
            historical_url = f"http://api.openweathermap.org/data/2.5/onecall/timemachine?lat={lat}&lon={lon}&dt={timestamp}&appid={OPENWEATHER_API_KEY}&units=metric"
            logger.debug(f"Fetching historical weather for day {i} from: {historical_url}")
            response = requests.get(historical_url)
            response.raise_for_status()
            historical_data = response.json()
            logger.debug(f"Historical weather response for day {i}: {historical_data}")
            
            if 'current' in historical_data:
                data_point = {
                    'date': date.strftime('%Y-%m-%d'),
                    'temperature': historical_data['current']['temp'],
                    'humidity': historical_data['current']['humidity'],
                    'pressure': historical_data['current']['pressure']
                }
                data.append(data_point)
                logger.info(f"Added data point: {data_point}")
        
        data_store.weather_data = data
        logger.info(f"Successfully collected {len(data)} weather data points")
        return jsonify(data)
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching weather data: {str(e)}")
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error in weather data: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/financial', methods=['GET'])
def get_financial_data():
    try:
        logger.info("Fetching financial data...")
        symbols = ['AAPL', 'GOOGL', 'MSFT']
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        data = []
        for symbol in symbols:
            logger.debug(f"Fetching data for symbol: {symbol}")
            stock = yf.Ticker(symbol)
            hist = stock.history(start=start_date, end=end_date)
            logger.debug(f"Received data for {symbol}: {len(hist)} records")
            
            for date, row in hist.iterrows():
                data_point = {
                    'date': date.strftime('%Y-%m-%d'),
                    'symbol': symbol,
                    'close': float(row['Close']),
                    'volume': float(row['Volume']),
                    'high': float(row['High']),
                    'low': float(row['Low'])
                }
                data.append(data_point)
                logger.debug(f"Added financial data point: {data_point}")
        
        data = sorted(data, key=lambda x: x['date'])
        data_store.financial_data = data
        logger.info(f"Successfully collected {len(data)} financial data points")
        return jsonify(data)
    except Exception as e:
        logger.error(f"Error in financial data: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def get_health_data():
    try:
        logger.info("Fetching health data...")
        url = "https://disease.sh/v3/covid-19/historical/all?lastdays=30"
        logger.debug(f"Fetching health data from: {url}")
        response = requests.get(url)
        response.raise_for_status()
        covid_data = response.json()
        logger.debug(f"Received health data: {covid_data}")
        
        data = []
        for date in covid_data['cases'].keys():
            data_point = {
                'date': date,
                'cases': covid_data['cases'][date],
                'deaths': covid_data['deaths'][date],
                'recovered': covid_data['recovered'][date]
            }
            data.append(data_point)
            logger.debug(f"Added health data point: {data_point}")
        
        data_store.health_data = data
        logger.info(f"Successfully collected {len(data)} health data points")
        return jsonify(data)
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching health data: {str(e)}")
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error in health data: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/tech/companies/<category>')
def get_tech_companies(category):
    if category in TECH_COMPANIES:
        return jsonify(TECH_COMPANIES[category])
    return jsonify({"error": "Category not found"}), 404

@app.route('/api/tech/data')
def get_tech_data():
    try:
        category = request.args.get('category')
        company = request.args.get('company')
        metric = request.args.get('metric', 'stock_price')

        if not category or not company:
            return jsonify({"error": "Category and company are required"}), 400

        # Ensure category and company are valid according to backend mapping
        if category not in TECH_COMPANIES:
             return jsonify({"error": f"Invalid technology category: {category}"}), 400
        if company not in TECH_COMPANIES[category]:
             return jsonify({"error": f"Invalid company symbol '{company}' for category '{category}'"}), 400

        # Use Alpha Vantage API
        url = f'https://www.alphavantage.co/query'
        params = {
            'function': 'TIME_SERIES_DAILY',
            'symbol': company,
            'apikey': ALPHA_VANTAGE_API_KEY
        }
        response = requests.get(url, params=params)
        data_json = response.json()
        
        logger.debug('Raw Alpha Vantage response for tech data:', data_json) # Log raw response

        # Check if response is empty or none
        if not data_json:
             logger.error('Alpha Vantage returned empty or invalid JSON response.')
             return jsonify({"error": "Received empty or invalid data from Alpha Vantage."}), 500

        if 'Time Series (Daily)' not in data_json:
            # Check for Alpha Vantage error or rate limit
            if 'Note' in data_json:
                logger.warning("Alpha Vantage rate limit reached: " + data_json['Note'])
                return jsonify({"error": "Alpha Vantage rate limit reached. Please wait a minute and try again."}), 429
            if 'Error Message' in data_json:
                logger.error("Alpha Vantage error: " + data_json['Error Message'])
                return jsonify({"error": data_json['Error Message']}), 400
            # Handle other unexpected Alpha Vantage response formats
            logger.error("Alpha Vantage unknown error response or unexpected format: " + str(data_json))
            return jsonify({"error": "Unexpected data format from Alpha Vantage. Check server logs."}), 500

        time_series = data_json['Time Series (Daily)']
        data = []
        for date, values in sorted(time_series.items()):
            data_point = {
                'date': date,
                'company': company,
                'company_name': TECH_COMPANIES[category][company],
                'category': category,
                'stock_price': float(values['4. close']),
                'trading_volume': float(values['5. volume']),
                'volatility': float(values['2. high']) - float(values['3. low'])
            }
            data.append(data_point)
        data_store.tech_data = data
        logger.info(f"Successfully collected {len(data)} tech data points from Alpha Vantage")
        return jsonify(data)
    except Exception as e:
        logger.error(f"Error in tech data: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/agriculture/crops')
def get_crops():
    return jsonify(list(AGRICULTURAL_REGIONS.keys()))

@app.route('/api/agriculture/regions/<crop>')
def get_regions(crop):
    if crop in AGRICULTURAL_REGIONS:
        return jsonify(AGRICULTURAL_REGIONS[crop])
    return jsonify([]), 404

@app.route('/api/agriculture/data')
def get_agriculture_data():
    try:
        crop = request.args.get('crop')
        region = request.args.get('region')
        metric = request.args.get('metric', 'temperature')

        if not crop or not region:
            return jsonify({"error": "Crop and region are required"}), 400

        if crop not in AGRICULTURAL_REGIONS or region not in AGRICULTURAL_REGIONS[crop]:
            return jsonify({"error": "Invalid crop or region"}), 400

        # Get weather data for the region
        # Note: You'll need to map regions to coordinates or city names
        city = region.split()[0]  # Simplified mapping
        
        current_url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={OPENWEATHER_API_KEY}&units=metric"
        response = requests.get(current_url)
        current_data = response.json()

        if 'coord' not in current_data:
            return jsonify({"error": "Weather data not available"}), 500

        lat = current_data['coord']['lat']
        lon = current_data['coord']['lon']

        # Get historical weather data
        data = []
        for i in range(30):
            date = datetime.now() - timedelta(days=i)
            timestamp = int(date.timestamp())
            
            historical_url = f"http://api.openweathermap.org/data/2.5/onecall/timemachine?lat={lat}&lon={lon}&dt={timestamp}&appid={OPENWEATHER_API_KEY}&units=metric"
            response = requests.get(historical_url)
            historical_data = response.json()

            if 'current' in historical_data:
                # Simulate crop production data based on weather
                temperature = historical_data['current']['temp']
                humidity = historical_data['current'].get('humidity', 50)
                
                # Simple simulation of crop production based on weather
                production = (
                    100 + # base production
                    (temperature - 20) * 2 + # temperature effect
                    (humidity - 50) * 0.5    # humidity effect
                )

                data_point = {
                    'date': date.strftime('%Y-%m-%d'),
                    'crop': crop,
                    'region': region,
                    'temperature': temperature,
                    'humidity': humidity,
                    'production': max(0, production),  # Ensure non-negative
                    'rainfall': historical_data['current'].get('rain', {}).get('1h', 0),
                    'soil_moisture': humidity * 0.8  # Simplified simulation
                }
                data.append(data_point)

        data_store.agriculture_data = data
        logger.info(f"Successfully collected {len(data)} agriculture data points")
        return jsonify(data)
    except Exception as e:
        logger.error(f"Error in agriculture data: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/agriculture/timeseries')
def get_agriculture_timeseries():
    try:
        crop = request.args.get('crop')
        region = request.args.get('region')
        metric = request.args.get('metric', 'temperature')
        if not crop or not region or not metric:
            return jsonify({'error': 'Missing crop, region, or metric'}), 400
        if crop not in AGRICULTURAL_REGIONS or region not in AGRICULTURAL_REGIONS[crop]:
            return jsonify({'error': 'Invalid crop or region'}), 400
        # Simulate data as in get_agriculture_data
        city = region.split()[0]
        current_url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={OPENWEATHER_API_KEY}&units=metric"
        response = requests.get(current_url)
        current_data = response.json()
        if 'coord' not in current_data:
            return jsonify({'error': 'Weather data not available'}), 500
        lat = current_data['coord']['lat']
        lon = current_data['coord']['lon']
        data = []
        for i in range(30):
            date = datetime.now() - timedelta(days=i)
            timestamp = int(date.timestamp())
            historical_url = f"http://api.openweathermap.org/data/2.5/onecall/timemachine?lat={lat}&lon={lon}&dt={timestamp}&appid={OPENWEATHER_API_KEY}&units=metric"
            response = requests.get(historical_url)
            historical_data = response.json()
            if 'current' in historical_data:
                temperature = historical_data['current']['temp']
                humidity = historical_data['current'].get('humidity', 50)
                data_point = {
                    'date': date.strftime('%Y-%m-%d'),
                    'temperature': temperature,
                    'humidity': humidity,
                    'rainfall': historical_data['current'].get('rain', {}).get('1h', 0),
                    'sunshine': historical_data['current'].get('sunshine', 8),
                }
                data.append(data_point)
        data = sorted(data, key=lambda x: x['date'])
        return jsonify({
            'dates': [d['date'] for d in data],
            'values': [d.get(metric, None) for d in data]
        })
    except Exception as e:
        logger.error(f"Error in agriculture timeseries: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/agriculture/correlation')
def get_agriculture_correlation():
    try:
        mode = request.args.get('mode')
        crop = request.args.get('crop')
        if mode == 'regions':
            region1 = request.args.get('region1')
            region2 = request.args.get('region2')
            metric = request.args.get('metric', 'temperature')
            if not crop or not region1 or not region2 or not metric:
                return jsonify({'error': 'Missing crop, regions, or metric'}), 400
            # Get timeseries for both regions
            def get_series(region):
                city = region.split()[0]
                current_url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={OPENWEATHER_API_KEY}&units=metric"
                response = requests.get(current_url)
                current_data = response.json()
                if 'coord' not in current_data:
                    return []
                lat = current_data['coord']['lat']
                lon = current_data['coord']['lon']
                data = []
                for i in range(30):
                    date = datetime.now() - timedelta(days=i)
                    timestamp = int(date.timestamp())
                    historical_url = f"http://api.openweathermap.org/data/2.5/onecall/timemachine?lat={lat}&lon={lon}&dt={timestamp}&appid={OPENWEATHER_API_KEY}&units=metric"
                    response = requests.get(historical_url)
                    historical_data = response.json()
                    if 'current' in historical_data:
                        data_point = {
                            'date': date.strftime('%Y-%m-%d'),
                            metric: historical_data['current'].get(metric, None)
                        }
                        data.append(data_point)
                return sorted(data, key=lambda x: x['date'])
            data1 = get_series(region1)
            data2 = get_series(region2)
            # Merge on date
            df1 = pd.DataFrame(data1)
            df2 = pd.DataFrame(data2)
            merged = pd.merge(df1, df2, on='date', suffixes=('_1', '_2'))
            x = merged[f'{metric}_1'].tolist()
            y = merged[f'{metric}_2'].tolist()
            pearson = float(pd.Series(x).corr(pd.Series(y))) if x and y and len(x) == len(y) and len(x) > 1 else 0.0
            return jsonify({'x': x, 'y': y, 'pearson': pearson})
        elif mode == 'metrics':
            region = request.args.get('region')
            metric1 = request.args.get('metric1')
            metric2 = request.args.get('metric2')
            if not crop or not region or not metric1 or not metric2:
                return jsonify({'error': 'Missing crop, region, or metrics'}), 400
            # Get timeseries for both metrics
            city = region.split()[0]
            current_url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={OPENWEATHER_API_KEY}&units=metric"
            response = requests.get(current_url)
            current_data = response.json()
            if 'coord' not in current_data:
                return jsonify({'error': 'Weather data not available'}), 500
            lat = current_data['coord']['lat']
            lon = current_data['coord']['lon']
            data = []
            for i in range(30):
                date = datetime.now() - timedelta(days=i)
                timestamp = int(date.timestamp())
                historical_url = f"http://api.openweathermap.org/data/2.5/onecall/timemachine?lat={lat}&lon={lon}&dt={timestamp}&appid={OPENWEATHER_API_KEY}&units=metric"
                response = requests.get(historical_url)
                historical_data = response.json()
                if 'current' in historical_data:
                    data_point = {
                        'date': date.strftime('%Y-%m-%d'),
                        metric1: historical_data['current'].get(metric1, None),
                        metric2: historical_data['current'].get(metric2, None)
                    }
                    data.append(data_point)
            data = sorted(data, key=lambda x: x['date'])
            x = [d.get(metric1, None) for d in data]
            y = [d.get(metric2, None) for d in data]
            pearson = float(pd.Series(x).corr(pd.Series(y))) if x and y and len(x) == len(y) and len(x) > 1 else 0.0
            return jsonify({'x': x, 'y': y, 'pearson': pearson})
        else:
            return jsonify({'error': 'Invalid mode'}), 400
    except Exception as e:
        logger.error(f"Error in agriculture correlation: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/data/correlation', methods=['POST'])
def analyze_correlation():
    try:
        logger.info("Calculating correlation...")
        data = request.json
        dataset1 = data.get('dataset1')
        dataset2 = data.get('dataset2')
        
        logger.debug(f"Analyzing correlation between {dataset1} and {dataset2}")
        
        # Get data from respective datasets
        data1 = getattr(data_store, f"{dataset1}_data", [])
        data2 = getattr(data_store, f"{dataset2}_data", [])
        
        if not data1 or not data2:
            logger.error("Invalid datasets")
            return jsonify({"error": "Invalid datasets"}), 400
            
        # Convert to pandas DataFrames
        df1 = pd.DataFrame(data1)
        df2 = pd.DataFrame(data2)
        
        logger.debug(f"Dataset 1 columns: {df1.columns.tolist()}")
        logger.debug(f"Dataset 2 columns: {df2.columns.tolist()}")
        
        # Get numeric columns for correlation
        numeric_cols1 = df1.select_dtypes(include=[np.number]).columns
        numeric_cols2 = df2.select_dtypes(include=[np.number]).columns
        
        # Calculate correlations between all numeric columns
        correlations = {}
        for col1 in numeric_cols1:
            for col2 in numeric_cols2:
                # Merge datasets on date
                merged_df = pd.merge(
                    df1[['date', col1]], 
                    df2[['date', col2]], 
                    on='date', 
                    how='inner'
                )
                if not merged_df.empty:
                    correlation = merged_df[col1].corr(merged_df[col2])
                    if not pd.isna(correlation):
                        key = f"{col1} vs {col2}"
                        correlations[key] = float(correlation)
                        logger.debug(f"Correlation between {col1} and {col2}: {correlation}")
        
        logger.info(f"Calculated {len(correlations)} correlations")
        return jsonify({
            "correlations": correlations,
            "dataset1": dataset1,
            "dataset2": dataset2
        })
    except Exception as e:
        logger.error(f"Error in correlation analysis: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
