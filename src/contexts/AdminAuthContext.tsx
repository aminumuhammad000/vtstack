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
            const storedToken = localStorage.getItem('authToken');
            const storedUser = localStorage.getItem('authUser');

            if (storedToken && storedUser && storedUser !== 'undefined') {
                try {
                    setToken(storedToken);
                    setUser(JSON.parse(storedUser));
                } catch (error) {
                    console.error('Failed to parse stored user:', error);
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('authUser');
                }
            } else {
                localStorage.removeItem('authToken');
                localStorage.removeItem('authUser');
            }
            setLoading(false);
        }
    }, []);

    const refreshUser = async () => {
        try {
            const currentToken = token || (typeof window !== 'undefined' ? localStorage.getItem('authToken') : null);
            if (!currentToken) return;

            const response = await axios.get('/api/admin/profile', {
                headers: { Authorization: `Bearer ${currentToken}` }
            });
            if (response.data.success) {
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
            localStorage.setItem('authUser', JSON.stringify(newUser));
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
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
export const AuthProvider = AdminAuthProvider;

export default AdminAuthContext;
