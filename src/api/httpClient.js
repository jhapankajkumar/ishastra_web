import { getAccessToken, setAccessToken } from '../auth/tokenStore';

// Shared across every axios instance that attaches these interceptors, so a
// 401 hitting two API calls at once only triggers one /auth/refresh call —
// the second request just waits on the same in-flight promise.
let refreshPromise = null;

/**
 * Wires an axios instance with:
 *  - a request interceptor that attaches the in-memory access token
 *  - a response interceptor that, on a 401 (expired access token), calls
 *    /api/auth/refresh exactly once, updates the token store, and retries
 *    the original request with the new token.
 *
 * `refreshFn` is passed in (rather than imported directly) to avoid a
 * circular import with authApi.js, which itself uses this same helper.
 */
export function attachAuthInterceptors(axiosInstance, refreshFn) {
  axiosInstance.interceptors.request.use((requestConfig) => {
    const token = getAccessToken();
    if (token) {
      requestConfig.headers = requestConfig.headers || {};
      requestConfig.headers.Authorization = `Bearer ${token}`;
    }
    return requestConfig;
  });

  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      const status = error.response?.status;

      if ((status === 401 || status === 403) && refreshFn && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          if (!refreshPromise) {
            refreshPromise = refreshFn().finally(() => {
              refreshPromise = null;
            });
          }
          const { accessToken } = await refreshPromise;
          setAccessToken(accessToken);
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return axiosInstance(originalRequest);
        } catch (refreshError) {
          setAccessToken(null);
          return Promise.reject(error);
        }
      }

      return Promise.reject(error);
    }
  );
}
