import { API } from './baseApi';

/**
 * Get capital information for all currencies
 * @returns {Promise} Capital data with total, remaining, allocated amounts for each currency
 */
export const getCapitalInfo = async () => {
  try {
    const response = await API.get('/capital');
    return response.data;
  } catch (error) {
    console.error('Error fetching capital info:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch capital information');
  }
};

/**
 * Get capital information for a specific currency
 * @param {string} currency - Currency code (USD, INR)
 * @returns {Promise} Capital data for the specified currency
 */
export const getCapitalForCurrency = async (currency) => {
  try {
    const response = await getCapitalInfo();
    const capitalData = response.data?.find(item => item.currency === currency);
    
    if (!capitalData) {
      throw new Error(`Capital information not found for currency: ${currency}`);
    }
    
    return {
      success: true,
      data: capitalData,
      message: `Capital information for ${currency} retrieved successfully`
    };
  } catch (error) {
    console.error(`Error fetching capital info for ${currency}:`, error);
    throw error;
  }
};
