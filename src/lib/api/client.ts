import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (typeof window !== 'undefined' && error.response && (error.response.status === 401 || error.response.status === 403)) {
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
