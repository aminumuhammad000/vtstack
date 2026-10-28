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
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedToken = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            if (storedToken && storedUser) {
                try {
                    setToken(storedToken);
                    setUser(JSON.parse(storedUser));
                } catch (e) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            }
            setIsLoading(false);
        }
    }, []);

    const login = (newToken: string, newUser: User) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('token', newToken);
            localStorage.setItem('user', JSON.stringify(newUser));
        }
        setToken(newToken);
        setUser(newUser);
    };

    const logout = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
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

    const refreshUser = async () => {
        try {
            const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
            if (!authToken) return;

            const response = await axios.get('/api/auth/profile', {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            if (response.data.success) {
                updateUser(response.data.data);
            }
        } catch (error) {
            console.error('Failed to refresh user profile:', error);
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
