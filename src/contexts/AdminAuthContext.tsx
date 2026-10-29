'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

export interface AdminUser {
    _id: string;
    id?: string;
    email: string;
    firstName?: string;
    lastName?: string;
    first_name?: string;
    last_name?: string;
    role: string;
    status: string;
}

interface AdminAuthContextType {
    user: AdminUser | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (token: string, user: AdminUser) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
    loading: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AdminUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            let storedToken = localStorage.getItem('authToken') || localStorage.getItem('admin_token');
            let storedUser = localStorage.getItem('authUser') || localStorage.getItem('admin_user');

            // Fallback to cookie
            if (!storedToken) {
                const match = document.cookie.match(/(?:^|;\s*)(?:authToken|admin_token)=([^;]+)/);
                if (match) {
                    storedToken = decodeURIComponent(match[1]);
                    try {
                        localStorage.setItem('authToken', storedToken);
                    } catch {}
                }
            }

            if (storedToken && storedUser && storedUser !== 'undefined') {
                try {
                    setToken(storedToken);
                    setUser(JSON.parse(storedUser));
                } catch (error) {
                    console.error('Failed to parse stored admin user:', error);
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('authUser');
                }
            } else if (storedToken) {
                setToken(storedToken);
                refreshUser();
            }
            setLoading(false);
        }
    }, []);

    const refreshUser = async () => {
        try {
            const currentToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('authToken') || localStorage.getItem('admin_token')) : null);
            if (!currentToken) return;

            const response = await axios.get('/api/admin/profile', {
                headers: { Authorization: `Bearer ${currentToken}` }
            });
            if (response.data && response.data.success && response.data.data) {
                const newUser = response.data.data;
                setUser(newUser);
                if (typeof window !== 'undefined') {
                    localStorage.setItem('authUser', JSON.stringify(newUser));
                }
            }
        } catch (error) {
            console.error('Failed to refresh admin user:', error);
        }
    };

    const login = (newToken: string, newUser: AdminUser) => {
        setToken(newToken);
        setUser(newUser);
        if (typeof window !== 'undefined') {
            localStorage.setItem('authToken', newToken);
            localStorage.setItem('admin_token', newToken);
            localStorage.setItem('authUser', JSON.stringify(newUser));
            const maxAge = 30 * 24 * 60 * 60; // 30 days
            document.cookie = `authToken=${encodeURIComponent(newToken)}; path=/; max-age=${maxAge}; SameSite=Lax`;
            document.cookie = `admin_token=${encodeURIComponent(newToken)}; path=/; max-age=${maxAge}; SameSite=Lax`;
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('authToken');
            localStorage.removeItem('admin_token');
            localStorage.removeItem('authUser');
            localStorage.removeItem('admin_user');
            document.cookie = 'authToken=; path=/; max-age=0';
            document.cookie = 'admin_token=; path=/; max-age=0';
        }
    };

    return (
        <AdminAuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout, refreshUser, loading }}>
            {children}
        </AdminAuthContext.Provider>
    );
};

export const useAdminAuth = () => {
    const context = useContext(AdminAuthContext);
    if (context === undefined) {
        throw new Error('useAdminAuth must be used within an AdminAuthProvider');
    }
    return context;
};

export const useAuth = useAdminAuth;
export default AdminAuthContext;
