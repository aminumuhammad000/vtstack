'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    kycLevel: number;
    kyc_status: 'pending' | 'verified' | 'rejected';
    kyc_tier: 't1' | 't2' | 't3' | 'none';
    status: string;
    role: 'user' | 'admin';
    fullName?: string;
    webhookActive?: boolean;
    profilePicture?: string;

    // KYC Fields
    state?: string;
    lga?: string;
    address?: string;
    identityType?: string;
    nin?: string;
    bvn?: string;
    idCardPath?: string;
    selfiePath?: string;
    utilityBillPath?: string;

    // Business Fields
    businessName?: string;
    businessAddress?: string;
    businessPhone?: string;
    rcNumber?: string;
    cacDocumentPath?: string;
    isPayoutEnabled?: boolean;
    payoutRequestStatus?: 'none' | 'pending' | 'approved' | 'rejected';
    payoutRequestReason?: string;
    payoutIpWhitelist?: string[];
    webhookUrl?: string;
    transactionPinSet?: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
    updateUser: (user: User) => void;
    refreshUser: (explicitToken?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            let storedToken = localStorage.getItem('token');
            let storedUser = localStorage.getItem('user');

            // Fallback to cookie if localStorage is empty
            if (!storedToken) {
                const match = document.cookie.match(/(?:^|;\s*)(?:token|auth_token)=([^;]+)/);
                if (match) {
                    storedToken = decodeURIComponent(match[1]);
                    try {
                        localStorage.setItem('token', storedToken);
                    } catch {}
                }
            }

            if (storedToken) {
                setToken(storedToken);
                if (storedUser) {
                    try {
                        setUser(JSON.parse(storedUser));
                    } catch (e) {
                        localStorage.removeItem('user');
                    }
                }
                // Refresh profile in background without logging out
                refreshUser(storedToken);
            }
            setIsLoading(false);
        }
    }, []);

    const login = (newToken: string, newUser: User) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('token', newToken);
            localStorage.setItem('user', JSON.stringify(newUser));
            const maxAge = 30 * 24 * 60 * 60; // 30 days
            document.cookie = `token=${encodeURIComponent(newToken)}; path=/; max-age=${maxAge}; SameSite=Lax`;
            document.cookie = `auth_token=${encodeURIComponent(newToken)}; path=/; max-age=${maxAge}; SameSite=Lax`;
        }
        setToken(newToken);
        setUser(newUser);
    };

    const logout = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            document.cookie = 'token=; path=/; max-age=0';
            document.cookie = 'auth_token=; path=/; max-age=0';
        }
        setToken(null);
        setUser(null);
    };

    const updateUser = (updatedUser: User) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(updatedUser));
        }
        setUser(updatedUser);
    };

    const refreshUser = async (explicitToken?: string) => {
        try {
            const authToken = explicitToken || token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
            if (!authToken) return;

            const response = await axios.get('/api/auth/profile', {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            if (response.data && response.data.success && response.data.data) {
                updateUser(response.data.data);
            }
        } catch (error) {
            console.warn('Failed to refresh user profile in background:', error);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated: !!token,
                isLoading,
                login,
                logout,
                updateUser,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
