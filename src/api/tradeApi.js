import {API} from './baseApi';

export const getAllTrades = () => API.get('/trades');
export const createTrade = (formData) => API.post('/trades', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
