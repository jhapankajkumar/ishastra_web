// In-memory access token store — deliberately NOT localStorage/sessionStorage.
// A token here is invisible to any injected script (no XSS-exfiltration path)
// and is naturally cleared on every page reload; AuthContext re-hydrates it
// on mount via a silent /api/auth/refresh call using the httpOnly cookie.
let accessToken = null;

export const getAccessToken = () => accessToken;

export const setAccessToken = (token) => {
  accessToken = token;
};

export const clearAccessToken = () => {
  accessToken = null;
};
