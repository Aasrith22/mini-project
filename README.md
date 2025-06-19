# Data Visualization Platform

A responsive web application for visualizing and analyzing correlations between technology, finance, agriculture, and weather data.

## Features

- **Technology & Finance Analysis**
  - View stock prices, market cap, trading volume, and volatility for major tech companies
  - Real-time data from Alpha Vantage API
  - Interactive visualizations using Plotly

- **Agriculture & Weather Analysis**
  - Track weather metrics (temperature, rainfall, humidity) across different regions
  - Real-time weather data from OpenWeather API
  - Analyze correlations with crop data

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/data-viz-platform.git
   cd data-viz-platform
   ```

2. Configure API Keys:
   - Get an API key from [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
   - Get an API key from [OpenWeather](https://openweathermap.org/api)
   - Update the keys in `static/config.js`

3. Run the application:
   - Open `index.html` in a web browser
   - For local development, use a local server to avoid CORS issues

## Technologies Used

- HTML5, CSS3, JavaScript
- Bootstrap 5.1.3 for responsive design
- Plotly 2.27.0 for data visualization
- Alpha Vantage API for financial data
- OpenWeather API for weather data

## Project Structure

```
data-viz-platform/
├── static/
│   ├── app.js         # Main application logic
│   ├── config.js      # API configuration
│   ├── styles.css     # Custom styles
│   └── index.html     # Main HTML file
└── README.md          # Documentation
```

## Contributing

1. Fork the repository
2. Create a new branch: `git checkout -b feature-name`
3. Make your changes and commit: `git commit -m 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Deployment on Netlify

### 1. Deploy the Frontend (Static Site)
- The `static/` folder contains all frontend files (HTML, JS, CSS).
- You can deploy this folder directly to Netlify:
  1. Drag and drop the `static/` folder in the Netlify dashboard, or connect your repo and set the publish directory to `static`.
  2. No build command is needed (static site).

### 2. Set Up API Proxy (_redirects)
- The file `static/_redirects` is used to proxy API requests to your backend.
- Edit the `_redirects` file and replace `https://YOUR-BACKEND-URL` with your actual backend deployment URL (e.g., Render, Heroku, Railway).

```
/api/*    https://YOUR-BACKEND-URL/api/:splat   200
```

### 3. Deploy the Backend
- Deploy your Flask backend (e.g., `app.py`) to a service that supports Python (Render, Heroku, etc.).
- Set your API keys as environment variables on the backend host.

### 4. Update API URLs (if needed)
- The frontend is set up to call `/api/...` endpoints, which will be proxied to your backend by Netlify.
- If you change the backend API structure, update the proxy rule in `_redirects` accordingly.

### 5. Test
- After deploying both frontend and backend, visit your Netlify site and verify that all features work and API calls are successful.
