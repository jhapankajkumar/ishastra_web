import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/investments`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Get all investments
export const getAllInvestments = async (status = null, ticker = null) => {
  try {
    const params = {};
    if (status) params.status = status;
    if (ticker) params.ticker = ticker;
    
    const response = await api.get('/', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching investments:', error);
    throw {
      type: error.response?.status >= 400 && error.response?.status < 500 ? 'CLIENT_ERROR' : 'SERVER_ERROR',
      message: error.response?.data?.message || 'Failed to fetch investments',
      status: error.response?.status
    };
  }
};

// Get single investment
export const getInvestmentById = async (id) => {
  try {
    const response = await api.get(`/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching investment:', error);
    throw {
      type: error.response?.status >= 400 && error.response?.status < 500 ? 'CLIENT_ERROR' : 'SERVER_ERROR',
      message: error.response?.data?.message || 'Failed to fetch investment',
      status: error.response?.status
    };
  }
};

// Create new investment
export const createInvestment = async (investmentData) => {
  try {
    const response = await api.post('/', investmentData);
    return response.data;
  } catch (error) {
    console.error('Error creating investment:', error);
    throw {
      type: error.response?.status >= 400 && error.response?.status < 500 ? 'CLIENT_ERROR' : 'SERVER_ERROR',
      message: error.response?.data?.message || 'Failed to create investment',
      status: error.response?.status
    };
  }
};

// Update investment
export const updateInvestment = async (id, investmentData) => {
  try {
    const response = await api.put(`/${id}`, investmentData);
    return response.data;
  } catch (error) {
    console.error('Error updating investment:', error);
    throw {
      type: error.response?.status >= 400 && error.response?.status < 500 ? 'CLIENT_ERROR' : 'SERVER_ERROR',
      message: error.response?.data?.message || 'Failed to update investment',
      status: error.response?.status
    };
  }
};

// Delete investment
export const deleteInvestment = async (id) => {
  try {
    const response = await api.delete(`/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting investment:', error);
    throw {
      type: error.response?.status >= 400 && error.response?.status < 500 ? 'CLIENT_ERROR' : 'SERVER_ERROR',
      message: error.response?.data?.message || 'Failed to delete investment',
      status: error.response?.status
    };
  }
};

// Close investment
export const closeInvestment = async (id, closeData) => {
  try {
    const response = await api.patch(`/${id}/close`, closeData);
    return response.data;
  } catch (error) {
    console.error('Error closing investment:', error);
    throw {
      type: error.response?.status >= 400 && error.response?.status < 500 ? 'CLIENT_ERROR' : 'SERVER_ERROR',
      message: error.response?.data?.message || 'Failed to close investment',
      status: error.response?.status
    };
  }
};

// Get investment summary
export const getInvestmentSummary = async () => {
  try {
    const response = await api.get('/summary');
    return response.data;
  } catch (error) {
    console.error('Error fetching investment summary:', error);
    throw {
      type: error.response?.status >= 400 && error.response?.status < 500 ? 'CLIENT_ERROR' : 'SERVER_ERROR',
      message: error.response?.data?.message || 'Failed to fetch investment summary',
      status: error.response?.status
    };
  }
};
