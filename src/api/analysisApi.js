/**
 * Analysis API Service
 * Handles all AI analysis and technical analysis endpoints
 */

import axios from 'axios';
import config from '../config/environment';

// Create a separate API instance for analysis with longer timeout
const AnalysisAPI_Instance = axios.create({
  baseURL: config.API_ENDPOINT,
  timeout: 120000, // 2 minutes timeout for analysis operations
});

// Add request and response interceptors for better error handling
AnalysisAPI_Instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      return Promise.reject({
        type: 'TIMEOUT_ERROR',
        message: 'Analysis is taking longer than expected. Please try again.',
        originalError: error
      });
    }
    
    if (!error.response) {
      return Promise.reject({
        type: 'NETWORK_ERROR',
        message: 'Unable to connect to analysis server. Please check your connection.',
        originalError: error
      });
    }
    
    return Promise.reject(error);
  }
);

/**
 * Get unified AI analysis combining all services
 */
export const getUnifiedAnalysis = async (symbol, period = '3mo', capital = 120000) => {
  try {
    const params = new URLSearchParams({
      symbols: symbol,
      period: period,
      capital: capital
    });
    const response = await AnalysisAPI_Instance.get(`/trading/signal-analysis?${params}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching unified analysis:', error);
    throw error;
  }
};

/**
 * Get watchlist with all stocks analysis
 */
export const getWatchlist = async () => {
  try {
    const response = await AnalysisAPI_Instance.get('/watchlist');
    return response.data;
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    throw error;
  }
};

// Export all analysis functions as a default object for convenience
const AnalysisAPI = {
  getUnifiedAnalysis,
  getWatchlist,
};

export default AnalysisAPI;
