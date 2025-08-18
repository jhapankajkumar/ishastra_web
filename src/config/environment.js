// Environment configuration utility
const config = {
  // API Configuration
  API_BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000',
  API_ENDPOINT: `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000'}/api`,
  
  // Frontend Configuration
  FRONTEND_URL: process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000',
  
  // Environment
  ENV: process.env.NODE_ENV || 'development',
  
  // Browser Configuration
  FORCE_IN_APP_BROWSER: process.env.REACT_APP_FORCE_IN_APP_BROWSER !== 'false', // Default true
  DEFAULT_THEME: process.env.REACT_APP_DEFAULT_THEME || 'light',
  
  // Helper methods
  getImageUrl: (imagePath) => {
    const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
    return `${baseUrl}/${imagePath}`;
  },
  
  getApiUrl: (endpoint) => {
    const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
    return `${baseUrl}/api${endpoint}`;
  },
  
  // Development utilities
  isDevelopment: () => {
    return process.env.NODE_ENV === 'development';
  },
  
  isProduction: () => {
    return process.env.NODE_ENV === 'production';
  }
};

// Log current configuration in development
if (config.isDevelopment()) {
  console.log('🔧 Environment Configuration:', {
    NODE_ENV: process.env.NODE_ENV,
    API_BASE_URL: config.API_BASE_URL,
    FRONTEND_URL: config.FRONTEND_URL,
    API_ENDPOINT: config.API_ENDPOINT,
    FORCE_IN_APP_BROWSER: config.FORCE_IN_APP_BROWSER,
    DEFAULT_THEME: config.DEFAULT_THEME
  });
}

export default config;
