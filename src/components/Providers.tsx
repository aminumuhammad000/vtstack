'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../context/AuthContext';
import { AdminAuthProvider } from '../contexts/AdminAuthContext';

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                refetchOnWindowFocus: false,
                retry: 1,
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <AdminAuthProvider>
                    <Toaster position="top-right" />
                    {children}
                </AdminAuthProvider>
            </AuthProvider>
        </QueryClientProvider>
    );
};

export default Providers;
