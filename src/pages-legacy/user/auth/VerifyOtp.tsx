'use client';

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '@/services/api';
import { Loader2, AlertCircle, ArrowRight, RefreshCw, CheckCircle2, ShieldCheck, Mail, Edit3 } from 'lucide-react';

export const VerifyOtp: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [isEditingEmail, setIsEditingEmail] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            // 1. Try URL search params (?email=...)
            const params = new URLSearchParams(window.location.search);
            const queryEmail = params.get('email');
            if (queryEmail) {
                setEmail(decodeURIComponent(queryEmail));
                return;
            }

            // 2. Try location state
            if (location.state?.email) {
                setEmail(location.state.email);
                return;
            }

            // 3. Try session storage
            const storedEmail = sessionStorage.getItem('verify_email');
            if (storedEmail) {
                setEmail(storedEmail);
                return;
            }
        }
    }, [location]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Only allow numbers, max 6 digits
        const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
        setOtp(value);
        setError('');
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setError('Please provide your email address');
            setIsEditingEmail(true);
            return;
        }

        if (otp.length !== 6) {
            setError('Please enter the complete 6-digit verification code');
            return;
        }

        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            await api.post('/auth/verify-otp', { email: email.trim(), otp: otp.trim() });
            setSuccess('Email verified successfully! Redirecting to login...');
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem('verify_email');
            }
            setTimeout(() => {
                navigate('/login');
            }, 1800);
        } catch (err: any) {
            console.error('Verification error:', err);
            setError(err.response?.data?.message || 'Invalid or expired OTP code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (!email) {
            setError('Email is required to resend OTP');
            setIsEditingEmail(true);
            return;
        }
        setIsResending(true);
        setError('');
        setSuccess('');

        try {
            await api.post('/auth/resend-otp', { email: email.trim() });
            setSuccess('Verification code resent! Please check your inbox.');
        } catch (err: any) {
            console.error('Resend OTP error:', err);
            setError(err.response?.data?.message || 'Failed to resend OTP.');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden animate-fade-in">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-50 rounded-2xl mb-6 shadow-sm transform rotate-3">
                            <ShieldCheck className="w-10 h-10 text-primary-600 transform -rotate-3" />
                        </div>
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Enter Verification Code</h2>
                        <p className="text-sm text-gray-500 mt-2 font-medium">
                            We sent a 6-digit one-time code to
                        </p>
                        {email ? (
                            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm font-semibold border border-primary-100 max-w-full truncate">
                                <Mail size={14} className="flex-shrink-0" />
                                <span className="truncate">{email}</span>
                                <button
                                    type="button"
                                    onClick={() => setIsEditingEmail(!isEditingEmail)}
                                    className="ml-1 text-primary-500 hover:text-primary-800 text-xs flex items-center gap-1 underline"
                                    title="Change email"
                                >
                                    <Edit3 size={12} />
                                </button>
                            </div>
                        ) : (
                            <p className="text-xs text-amber-600 mt-1 font-medium">Please enter your email below to verify</p>
                        )}
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 animate-fade-in">
                            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-800 font-bold">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl flex items-start gap-3 animate-fade-in">
                            <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-green-800 font-bold">{success}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {(!email || isEditingEmail) && (
                            <div className="animate-fade-in">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={handleEmailChange}
                                    placeholder="Enter your email"
                                    className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-100 focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none transition-all bg-gray-50 focus:bg-white text-sm font-bold text-gray-900 placeholder:text-gray-400"
                                    required
                                />
                            </div>
                        )}

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Verification Code</label>
                                <span className="text-xs text-gray-400 font-medium">6 digits</span>
                            </div>
                            <input
                                type="text"
                                inputMode="numeric"
                                autoFocus
                                value={otp}
                                onChange={handleChange}
                                placeholder="000000"
                                maxLength={6}
                                className="w-full px-4 py-4 rounded-xl border-2 border-gray-100 focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none transition-all bg-gray-50 focus:bg-white text-center text-3xl tracking-[0.6em] font-black text-gray-900 placeholder:tracking-normal placeholder:text-gray-300 placeholder:font-bold placeholder:text-lg"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-black text-base shadow-xl shadow-primary-200 hover:shadow-primary-300 transition-all transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-wide"
                            disabled={isLoading || !otp || otp.length !== 6 || !email}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    Verify Code
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <button
                            onClick={handleResendOtp}
                            disabled={isResending || !email}
                            className="text-sm font-bold text-gray-500 hover:text-primary-600 flex items-center justify-center gap-2 mx-auto disabled:opacity-50 transition-colors group"
                        >
                            {isResending ? (
                                <Loader2 size={16} className="animate-spin text-primary-600" />
                            ) : (
                                <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                            )}
                            Resend Code
                        </button>
                    </div>
                </div>
                <div className="bg-gray-50 p-6 text-center border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-600">
                        Back to{' '}
                        <Link to="/login" className="font-bold text-primary-600 hover:text-primary-700 hover:underline">
                            Login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};
