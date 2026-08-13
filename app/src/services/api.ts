import axios from 'axios';

// Create axios instance
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'https://api.vtstack.ng/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to add the auth token to headers
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle 401 errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            const requestUrl = error.config?.url || '';
            const isAuthEndpoint = requestUrl.includes('/auth/login') ||
                                 requestUrl.includes('/auth/register') ||
                                 requestUrl.includes('/auth/verify') ||
                                 requestUrl.includes('/auth/forgot-password') ||
                                 requestUrl.includes('/auth/reset-password');

            const isAuthPage = window.location.pathname === '/login' ||
                               window.location.pathname === '/register' ||
                               window.location.pathname.startsWith('/verify') ||
                               window.location.pathname === '/forgot-password' ||
                               window.location.pathname === '/reset-password';

            // Clear token and redirect to login if unauthorized or forbidden (suspended)
            // ONLY if we are not already on an auth page or making an auth request
            if (!isAuthEndpoint && !isAuthPage) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
