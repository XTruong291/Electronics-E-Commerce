import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { useAuthStore } from "../store/useAuthStore";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

const axiosClient: AxiosInstance = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Crucial: send/receive HttpOnly cookies across origins
  timeout: 10000,
});

// Request interceptor: Attach in-memory access token
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Shared promise for silent refresh to handle concurrent 401s gracefully
let refreshPromise: Promise<string> | null = null;

// Response interceptor: Catch 401, refresh token silently once, and retry
axiosClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt to refresh if error is already from refresh, login, or already retried
    if (
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes("/auth/refresh") ||
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/register")
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = axios
          .post(
            `${baseURL}/auth/refresh`,
            {},
            { withCredentials: true }
          )
          .then((res) => {
            const data = res.data;
            useAuthStore.getState().setAccessToken(data.access_token);
            if (data.user) {
              useAuthStore.getState().setUser(data.user);
            }
            return data.access_token;
          })
          .catch((refreshError) => {
            useAuthStore.getState().logout();
            // Redirect to login if user was on a protected page
            if (
              window.location.pathname.startsWith("/admin") ||
              window.location.pathname.startsWith("/profile")
            ) {
              window.location.href = `/login?redirect=${encodeURIComponent(
                window.location.pathname
              )}`;
            }
            throw refreshError;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      try {
        const newAccessToken = await refreshPromise;
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        return axiosClient(originalRequest);
      } catch (refreshErr) {
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
