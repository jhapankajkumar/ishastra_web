import { API } from './baseApi';

// Get current market indices data
export const getMarketIndices = async () => {
  try {
    const response = await API.get('/market/indices');
    return response.data;
  } catch (error) {
    console.error('Error fetching market indices:', error);
    throw error;
  }
};
