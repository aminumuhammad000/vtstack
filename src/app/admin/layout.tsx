'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import Layout from '@/components/admin/Layout';
import ErrorBoundary from '@/components/admin/common/ErrorBoundary';

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { isAuthenticated, user, loading } = useAdminAuth();

    const isLoginPage = pathname === '/admin/login';

    useEffect(() => {
        if (!loading && !isAuthenticated && !isLoginPage) {
            router.push('/admin/login');
        }
    }, [loading, isAuthenticated, isLoginPage, router]);

    if (isLoginPage) {
        return <ErrorBoundary>{children}</ErrorBoundary>;
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    if (user?.role !== 'admin' && user?.role !== 'subadmin') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
                <p className="text-gray-600 mb-4">You do not have permission to access the admin portal.</p>
                <button
                    onClick={() => router.push('/admin/login')}
                    className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                >
                    Go to Login
                </button>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <Layout>{children}</Layout>
        </ErrorBoundary>
    );
}
