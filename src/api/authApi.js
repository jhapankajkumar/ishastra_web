import axios from 'axios';
import config from '../config/environment';
import { attachAuthInterceptors } from './httpClient';

// withCredentials is required so the browser sends/receives the httpOnly
// refresh-token cookie on every call to this instance.
const authAxios = axios.create({
  baseURL: config.API_ENDPOINT,
  timeout: 30000,
  withCredentials: true,
});

// Request interceptor only (attaches the access token to /me, /profile,
// /password, /avatar) — no retry-on-401 here, since retrying a call to
// this same instance's own /auth/refresh on its own failure would loop.
attachAuthInterceptors(authAxios, null);

export const register = async ({ email, password, preferredCurrency }) => {
  const response = await authAxios.post('/auth/register', { email, password, preferredCurrency });
  return response.data;
};

export const verifyOtp = async ({ email, otp }) => {
  const response = await authAxios.post('/auth/verify-otp', { email, otp });
  return response.data;
};

export const resendOtp = async ({ email }) => {
  const response = await authAxios.post('/auth/resend-otp', { email });
  return response.data;
};

export const login = async ({ email, password }) => {
  const response = await authAxios.post('/auth/login', { email, password });
  return response.data;
};

export const logout = async () => {
  const response = await authAxios.post('/auth/logout');
  return response.data;
};

export const refresh = async () => {
  const response = await authAxios.post('/auth/refresh');
  return response.data;
};

export const forgotPassword = async ({ email }) => {
  const response = await authAxios.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async ({ token, newPassword }) => {
  const response = await authAxios.post('/auth/reset-password', { token, newPassword });
  return response.data;
};

export const me = async () => {
  const response = await authAxios.get('/auth/me');
  return response.data;
};

export const updateProfile = async (data) => {
  const response = await authAxios.patch('/auth/profile', data);
  return response.data;
};

export const updatePassword = async ({ currentPassword, newPassword }) => {
  const response = await authAxios.patch('/auth/password', { currentPassword, newPassword });
  return response.data;
};

export const uploadAvatar = async (file) => {
  const formData = new FormData();
  formData.append('avatar', file);
  const response = await authAxios.post('/auth/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export default authAxios;
