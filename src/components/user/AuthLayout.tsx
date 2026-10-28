'use client';

import React from 'react';

export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Brand Section */}
                <div className="text-center mb-1">
                    <img src="/logo.png" alt="VTStack" className="h-20 mx-auto mb-6 object-contain drop-shadow-sm" />
                </div>

                {/* Auth Content */}
                {children}

                {/* Footer */}
                <div className="mt-8 text-center space-y-2">
                    <p className="text-xs text-gray-400 font-medium">
                        © {new Date().getFullYear()} VTStack. Protected by enterprise-grade security.
                    </p>
                    <div className="flex items-center justify-center gap-4 text-[10px] text-gray-300 uppercase tracking-widest font-semibold">
                        <span>Privacy</span>
                        <span>•</span>
                        <span>Terms</span>
                        <span>•</span>
                        <span>Help</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
