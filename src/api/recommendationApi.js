import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/recommendations`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Get all recommendations
export const getAllRecommendations = async (status = null) => {
  try {
    const params = status ? { status } : {};
    const response = await api.get('/', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    throw {
      type: error.response?.status >= 400 && error.response?.status < 500 ? 'CLIENT_ERROR' : 'SERVER_ERROR',
      message: error.response?.data?.message || 'Failed to fetch recommendations',
      status: error.response?.status
    };
  }
};

// Get single recommendation
export const getRecommendationById = async (id) => {
  try {
    const response = await api.get(`/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching recommendation:', error);
    throw {
      type: error.response?.status >= 400 && error.response?.status < 500 ? 'CLIENT_ERROR' : 'SERVER_ERROR',
      message: error.response?.data?.message || 'Failed to fetch recommendation',
      status: error.response?.status
    };
  }
};

// Create new recommendation
export const createRecommendation = async (recommendationData) => {
  try {
    const response = await api.post('/', recommendationData);
    return response.data;
  } catch (error) {
    console.error('Error creating recommendation:', error);
    throw {
      type: error.response?.status >= 400 && error.response?.status < 500 ? 'CLIENT_ERROR' : 'SERVER_ERROR',
      message: error.response?.data?.message || 'Failed to create recommendation',
      status: error.response?.status
    };
  }
};

// Update recommendation
export const updateRecommendation = async (id, recommendationData) => {
  try {
    const response = await api.put(`/${id}`, recommendationData);
    return response.data;
  } catch (error) {
    console.error('Error updating recommendation:', error);
    throw {
      type: error.response?.status >= 400 && error.response?.status < 500 ? 'CLIENT_ERROR' : 'SERVER_ERROR',
      message: error.response?.data?.message || 'Failed to update recommendation',
      status: error.response?.status
    };
  }
};

// Delete recommendation
export const deleteRecommendation = async (id) => {
  try {
    const response = await api.delete(`/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting recommendation:', error);
    throw {
      type: error.response?.status >= 400 && error.response?.status < 500 ? 'CLIENT_ERROR' : 'SERVER_ERROR',
      message: error.response?.data?.message || 'Failed to delete recommendation',
      status: error.response?.status
    };
  }
};

// Archive/Unarchive recommendation
export const archiveRecommendation = async (id, archive = true) => {
  try {
    const response = await api.patch(`/${id}/archive`, { archive });
    return response.data;
  } catch (error) {
    console.error('Error archiving recommendation:', error);
    throw {
      type: error.response?.status >= 400 && error.response?.status < 500 ? 'CLIENT_ERROR' : 'SERVER_ERROR',
      message: error.response?.data?.message || 'Failed to archive recommendation',
      status: error.response?.status
    };
  }
};
