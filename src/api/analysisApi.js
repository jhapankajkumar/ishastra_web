/**
 * Analysis API Service
 * Handles all AI analysis and technical analysis endpoints
 */

import { API } from './baseApi';

/**
 * Get unified AI analysis combining all services
 */
export const getUnifiedAnalysis = async (symbol, period = '3mo', capital, diagnostics = false) => {
  try {
    const response = await API.get(`/trading/analysis`, {
      params: { symbol, period, capital, diagnostics }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching unified analysis:', error);
    throw error;
  }
};

/**
 * Get technical analysis (legacy endpoint)
 */
export const getTechnicalAnalysis = async (symbol, period = '3mo') => {
  try {
    const response = await API.get(`/trading/technical-analysis`, {
      params: { symbol, period }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching technical analysis:', error);
    throw error;
  }
};

/**
 * Get advanced analysis with sentiment and backtesting
 */
export const getAdvancedAnalysis = async (symbol, period = '3mo') => {
  try {
    const response = await API.get(`/trading/advanced-analysis`, {
      params: { symbol, period }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching advanced analysis:', error);
    throw error;
  }
};

/**
 * Get advanced technical analysis (846-line AI system)
 */
export const getAdvancedTechnicalAnalysis = async (symbol = 'RELIANCE.NS') => {
  try {
    const response = await API.get(`/trading/advanced-technical-analysis`, {
      params: { symbol }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching advanced technical analysis:', error);
    throw error;
  }
};

/**
 * Get multi-timeframe analysis
 */
export const getMultiTimeframeAnalysis = async (symbol = 'RELIANCE.NS') => {
  try {
    const response = await API.get(`/trading/multi-timeframe-analysis`, {
      params: { symbol }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching multi-timeframe analysis:', error);
    throw error;
  }
};

/**
 * Get sentiment-enhanced alerts
 */
export const getSentimentEnhancedAlerts = async () => {
  try {
    const response = await API.get(`/trading/sentiment-enhanced-alerts`);
    return response.data;
  } catch (error) {
    console.error('Error fetching sentiment-enhanced alerts:', error);
    throw error;
  }
};

/**
 * Get AI trading recommendations
 */
export const getAIRecommendations = async (tickers = []) => {
  try {
    const response = await API.post(`/trading/ai-recommendations`, {
      tickers
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching AI recommendations:', error);
    throw error;
  }
};

/**
 * Get portfolio data
 */
export const getPortfolioData = async () => {
  try {
    const response = await API.get(`/trading/portfolio`);
    return response.data;
  } catch (error) {
    console.error('Error fetching portfolio data:', error);
    throw error;
  }
};

/**
 * Get backtesting results
 */
export const getBacktestResults = async () => {
  try {
    const response = await API.get(`/trading/backtest-results`);
    return response.data;
  } catch (error) {
    console.error('Error fetching backtest results:', error);
    throw error;
  }
};

// Export all analysis functions as a default object for convenience
const AnalysisAPI = {
  getUnifiedAnalysis,
  getTechnicalAnalysis,
  getAdvancedAnalysis,
  getAdvancedTechnicalAnalysis,
  getMultiTimeframeAnalysis,
  getSentimentEnhancedAlerts,
  getAIRecommendations,
  getPortfolioData,
  getBacktestResults
};

export default AnalysisAPI;
