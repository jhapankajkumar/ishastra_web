import { API } from './baseApi';

// Search for ticker symbols
export const searchTickers = (query) => API.get(`/yahoo/search?q=${encodeURIComponent(query)}`);

// Get current price for a symbol
export const getCurrentPrice = (symbol) => API.get(`/yahoo/price?symbol=${encodeURIComponent(symbol)}`);

// Get technical indicators (ATR, EMA, SMA, RSI) for a symbol
export const getTechnicalIndicators = (symbol) => {
  return API.get(`/yahoo/indicator?symbol=${encodeURIComponent(symbol)}`);
};

// Legacy function for backward compatibility - now uses the indicator endpoint
export const getATR = (symbol, period1, period2) => {
  return getTechnicalIndicators(symbol);
};
