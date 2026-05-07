import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// Lazily injected store reference to avoid circular imports
let _store: { getState: () => any } | null = null;
export const injectStore = (store: { getState: () => any }) => {
  _store = store;
};

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
    baseURL:
      // @ts-ignore
      import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token and branch context to requests
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach current branch ID for admin branch-mode scoping
    if (_store) {
      const currentBranch = _store.getState().branch?.currentBranch;
      if (currentBranch?.id && config.headers) {
        config.headers['X-Branch-Id'] = String(currentBranch.id);
      }
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Queue to hold requests waiting for token refresh
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  failedQueue = [];
};

const clearAuthAndRedirect = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

// Response interceptor - Handle errors and token refresh
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return axiosInstance(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        isRefreshing = false;
        processQueue(new Error('No refresh token'), null);
        clearAuthAndRedirect();
        return Promise.reject(error);
      }

      try {
        // Try to refresh the token
        const response = await axios.post(
          `${(import.meta as any).env.VITE_API_URL || 'http://localhost:4000'}/api/auth/token/refresh/`,
          { refresh: refreshToken }
        );

        const { access } = response.data;
        localStorage.setItem('accessToken', access);

        // Notify all queued requests
        processQueue(null, access);

        // Retry the original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access}`;
        }
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh failed - notify queued requests and logout
        processQueue(refreshError, null);
        clearAuthAndRedirect();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle other errors
    if (error.response?.status === 403) {
      console.error('Permission denied');
    } else if (error.response?.status === 404) {
      console.error('Resource not found');
    } else if (error.response && error.response.status >= 500) {
      console.error('Server error');
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
