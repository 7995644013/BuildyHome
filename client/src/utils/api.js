/**
 * Authenticated fetch utility that automatically handles token refresh on 401 errors
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

let isRefreshing = false;
let refreshPromise = null;

/**
 * Get access token from localStorage
 */
const getAccessToken = () => {
  return localStorage.getItem("accessToken");
};

/**
 * Get refresh token from localStorage
 */
const getRefreshToken = () => {
  return localStorage.getItem("refreshToken");
};

/**
 * Clear all auth data from localStorage
 */
const clearAuthData = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("selectedProjectId");
};

/**
 * Refresh the access token
 */
const refreshAccessToken = async () => {
  const refreshTokenValue = getRefreshToken();
  if (!refreshTokenValue) {
    clearAuthData();
    throw new Error("No refresh token available");
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refreshTokenValue }),
  });

  const data = await response.json();

  if (response.ok) {
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    return data.accessToken;
  } else {
    // Clear tokens
    clearAuthData();
    throw new Error("Token refresh failed");
  }
};

/**
 * Authenticated fetch that automatically handles token refresh
 * @param {string} url - The URL to fetch
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>}
 */
export const authenticatedFetch = async (url, options = {}) => {
  const token = getAccessToken();

  // Add authorization header if token exists
  const headers = {
    ...options.headers,
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  // Make the initial request
  let response = await fetch(url, {
    ...options,
    headers,
  });

  // If we get a 401, try to refresh the token and retry
  if (response.status === 401) {
    // If we're already refreshing, wait for that to complete
    if (isRefreshing && refreshPromise) {
      try {
        const newToken = await refreshPromise;
        // Retry with new token
        headers.Authorization = `Bearer ${newToken}`;
        response = await fetch(url, {
          ...options,
          headers,
        });
      } catch (error) {
        // Refresh failed, return the original 401 response
        return response;
      }
    } else {
      // Start refresh process
      isRefreshing = true;
      refreshPromise = refreshAccessToken();

      try {
        const newToken = await refreshPromise;
        // Retry with new token
        headers.Authorization = `Bearer ${newToken}`;
        response = await fetch(url, {
          ...options,
          headers,
        });
      } catch (error) {
        // Refresh failed, return the original 401 response
        return response;
      } finally {
        isRefreshing = false;
        refreshPromise = null;
      }
    }
  }

  return response;
};

