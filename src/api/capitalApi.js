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

/**
 * Deposit funds into the current user's capital balance for a currency.
 * Non-SUPERUSER accounts may only deposit in their registered preferredCurrency
 * — the server enforces this, this call just surfaces the resulting error.
 * @param {number} amount
 * @param {string} currency - Currency code (USD, INR)
 */
export const depositCapital = async (amount, currency) => {
  try {
    const response = await API.post('/capital/deposit', { amount, currency });
    return response.data;
  } catch (error) {
    console.error('Error depositing capital:', error);
    throw new Error(error.response?.data?.message || 'Failed to deposit capital');
  }
};

/**
 * Withdraw funds from the current user's capital balance for a currency.
 * @param {number} amount
 * @param {string} currency - Currency code (USD, INR)
 */
export const withdrawCapital = async (amount, currency) => {
  try {
    const response = await API.post('/capital/withdraw', { amount, currency });
    return response.data;
  } catch (error) {
    console.error('Error withdrawing capital:', error);
    throw new Error(error.response?.data?.message || 'Failed to withdraw capital');
  }
};

/**
 * Get the current user's deposit/withdraw transaction ledger, newest first.
 * @param {string} [currency] - Optional currency filter
 */
export const getCapitalTransactions = async (currency) => {
  try {
    const response = await API.get('/capital/transactions', {
      params: currency ? { currency } : {},
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching capital transactions:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch capital transactions');
  }
};
