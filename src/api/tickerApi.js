import { API } from './baseApi';

// Search for ticker symbols
export const searchTickers = (query) => API.get(`/yahoo/search?q=${encodeURIComponent(query)}`);

// Get current price for a symbol
export const getCurrentPrice = (symbol) => API.get(`/yahoo/price?symbol=${encodeURIComponent(symbol)}`);

// Get ATR for a symbol, with optional period1 and period2 (YYYY-MM-DD)
export const getATR = (symbol, period1, period2) => {
  let url = `/yahoo/atr?symbol=${encodeURIComponent(symbol)}`;
  if (period1 && period2) {
    url += `&period1=${encodeURIComponent(period1)}&period2=${encodeURIComponent(period2)}`;
  }
  return API.get(url);
};
