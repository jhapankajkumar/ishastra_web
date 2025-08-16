/**
 * Analysis API Service
 * Handles all AI analysis and technical analysis endpoints
 */

import { API } from './baseApi';

/**
 * Get unified AI analysis combining all services
 */
export const getUnifiedAnalysis = async (symbol) => {
  try {
    const response = await API.get(`/trading/signal-analysis?symbols=${symbol}`)
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
    const response = await API.get('/watchlist');
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
