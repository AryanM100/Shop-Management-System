import axios from "axios";

// All API calls go through /api, proxied to the backend in dev via vite.config.ts.
const client = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || "") + "/api",
  withCredentials: true,
});

// Response interceptor to catch 401 Unauthorized errors and automatically refresh tokens
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 and request hasn't been retried yet
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/login")
    ) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh the access token via the HTTP-only refresh cookie
        await client.post("/auth/refresh");
        // Retry the original request with the new access token cookie set
        return client(originalRequest);
      } catch (refreshError) {
        // If refresh fails (token expired/revoked), reject promise
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default client;
