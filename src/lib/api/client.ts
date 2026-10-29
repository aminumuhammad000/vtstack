import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

function getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    let token = localStorage.getItem('token');
    if (!token) {
        const match = document.cookie.match(/(?:^|;\s*)(?:token|auth_token)=([^;]+)/);
        if (match) {
            token = decodeURIComponent(match[1]);
        }
    }
    return token;
}

function isTokenExpired(token: string): boolean {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        const payloadBase64 = parts[1];
        const decodedJson = JSON.parse(atob(payloadBase64));
        if (decodedJson.exp && decodedJson.exp * 1000 < Date.now()) {
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

api.interceptors.request.use(
    (config) => {
        const token = getStoredToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (typeof window !== 'undefined' && error.response && (error.response.status === 401 || error.response.status === 403)) {
            const token = getStoredToken();
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

            // Only redirect to login if the token is completely missing or mathematically expired
            if (!isAuthEndpoint && !isAuthPage && (!token || isTokenExpired(token))) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                document.cookie = 'token=; path=/; max-age=0';
                document.cookie = 'auth_token=; path=/; max-age=0';
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
