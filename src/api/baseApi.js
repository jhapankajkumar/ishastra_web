import axios from 'axios';
import config from '../config/environment';

export const API = axios.create({
  baseURL: config.API_ENDPOINT,
  timeout: 10000, // 10 second timeout
});

// Request interceptor
API.interceptors.request.use(
  (config) => {
    // You can add auth tokens here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors globally
API.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Network error
    if (!error.response) {
      return Promise.reject({
        type: 'NETWORK_ERROR',
        message: 'Unable to connect to server. Please check your internet connection.',
        originalError: error
      });
    }

    // Server error
    if (error.response.status >= 500) {
      return Promise.reject({
        type: 'SERVER_ERROR',
        message: 'Server error. Please try again later.',
        status: error.response.status,
        originalError: error
      });
    }

    // Client error (4xx)
    if (error.response.status >= 400) {
      return Promise.reject({
        type: 'CLIENT_ERROR',
        message: error.response.data?.error || 'Something went wrong.',
        status: error.response.status,
        originalError: error
      });
    }

    return Promise.reject(error);
  }
);