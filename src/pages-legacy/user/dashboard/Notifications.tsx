'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/services/api';
import {
    Bell,
    CheckCheck,
    Clock,
    ArrowUpRight,
    ArrowDownLeft,
    ShieldCheck,
    CreditCard,
    Megaphone,
    Sparkles,
    Loader2,
    RefreshCw,
    ExternalLink,
    CheckCircle2,
    Inbox
} from 'lucide-react';

interface NotificationItem {
    id: string;
    _id?: string;
    title: string;
    message: string;
    type: 'system' | 'transaction' | 'kyc' | 'payout' | 'announcement';
    isRead: boolean;
    read?: boolean;
    link?: string;
    createdAt: string;
}

export const Notifications: React.FC = () => {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMarkingAll, setIsMarkingAll] = useState(false);
    const [filter, setFilter] = useState<'all' | 'unread' | 'transaction' | 'kyc' | 'announcement'>('all');

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/notifications');
            if (res.data?.success && Array.isArray(res.data?.data)) {
                setNotifications(res.data.data);
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMarkAllRead = async () => {
        setIsMarkingAll(true);
        try {
            await api.post('/notifications', { action: 'read_all' });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true, read: true })));
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        } finally {
            setIsMarkingAll(false);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            await api.post('/notifications', { id });
            setNotifications(prev =>
                prev.map(n => (n.id === id || n._id === id ? { ...n, isRead: true, read: true } : n))
            );
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const formatTimeAgo = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

            if (diffInSeconds < 60) return 'Just now';
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
            if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'transaction':
                return <ArrowDownLeft className="w-5 h-5 text-emerald-600" />;
            case 'kyc':
                return <ShieldCheck className="w-5 h-5 text-blue-600" />;
            case 'payout':
                return <CreditCard className="w-5 h-5 text-purple-600" />;
            case 'announcement':
                return <Megaphone className="w-5 h-5 text-amber-600" />;
            case 'system':
            default:
                return <Sparkles className="w-5 h-5 text-primary-600" />;
        }
    };

    const getTypeBg = (type: string) => {
        switch (type) {
            case 'transaction':
                return 'bg-emerald-50 border-emerald-100';
            case 'kyc':
                return 'bg-blue-50 border-blue-100';
            case 'payout':
                return 'bg-purple-50 border-purple-100';
            case 'announcement':
                return 'bg-amber-50 border-amber-100';
            case 'system':
            default:
                return 'bg-primary-50 border-primary-100';
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead && !n.read).length;

    const filteredNotifications = notifications.filter(item => {
        const isUnread = !item.isRead && !item.read;
        if (filter === 'unread') return isUnread;
        if (filter === 'transaction') return item.type === 'transaction';
        if (filter === 'kyc') return item.type === 'kyc';
        if (filter === 'announcement') return item.type === 'announcement';
        return true;
    });

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary-50 text-primary-600 rounded-xl">
                            <Bell className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Track account updates, transaction receipts, security notices, and announcements.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchNotifications}
                        disabled={isLoading}
                        className="p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition border border-gray-200"
                        title="Refresh"
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin text-primary-600' : ''} />
                    </button>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            disabled={isMarkingAll}
                            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition shadow-sm disabled:opacity-50"
                        >
                            <CheckCheck size={18} />
                            <span>{isMarkingAll ? 'Marking...' : 'Mark all as read'}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                        filter === 'all'
                            ? 'bg-gray-900 text-white shadow-sm'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                >
                    All ({notifications.length})
                </button>
                <button
                    onClick={() => setFilter('unread')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                        filter === 'unread'
                            ? 'bg-primary-600 text-white shadow-sm'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                >
                    <span>Unread</span>
                    {unreadCount > 0 && (
                        <span className={`px-1.5 py-0.5 text-xs rounded-full font-bold ${filter === 'unread' ? 'bg-white text-primary-600' : 'bg-primary-100 text-primary-600'}`}>
                            {unreadCount}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setFilter('transaction')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                        filter === 'transaction'
                            ? 'bg-gray-900 text-white shadow-sm'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                >
                    Transactions
                </button>
                <button
                    onClick={() => setFilter('kyc')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                        filter === 'kyc'
                            ? 'bg-gray-900 text-white shadow-sm'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                >
                    KYC & Security
                </button>
                <button
                    onClick={() => setFilter('announcement')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                        filter === 'announcement'
                            ? 'bg-gray-900 text-white shadow-sm'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                >
                    Announcements
                </button>
            </div>

            {/* Notifications List */}
            {isLoading ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Loading your notifications...</p>
                </div>
            ) : filteredNotifications.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
                        <Inbox className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">
                        {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                    </h3>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto">
                        {filter === 'unread'
                            ? 'You are all caught up! Check back later for new updates.'
                            : 'When account events, transactions, or system announcements happen, you will see them here.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredNotifications.map((notif) => {
                        const isUnread = !notif.isRead && !notif.read;
                        return (
                            <div
                                key={notif.id || notif._id}
                                className={`group p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                                    isUnread
                                        ? 'bg-blue-50/40 border-primary-200 shadow-sm'
                                        : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                                }`}
                            >
                                <div className="flex items-start gap-4">
                                    {/* Icon */}
                                    <div className={`p-2.5 rounded-xl border flex-shrink-0 ${getTypeBg(notif.type)}`}>
                                        {getTypeIcon(notif.type)}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                                                {notif.title}
                                            </h3>
                                            {isUnread && (
                                                <span className="w-2 h-2 rounded-full bg-primary-600 flex-shrink-0"></span>
                                            )}
                                        </div>

                                        <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed mb-3">
                                            {notif.message}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Clock size={13} />
                                                {formatTimeAgo(notif.createdAt)}
                                            </span>

                                            {notif.link && (
                                                <Link
                                                    href={notif.link}
                                                    className="flex items-center gap-1 text-primary-600 hover:text-primary-700 font-semibold transition"
                                                >
                                                    <span>Open page</span>
                                                    <ExternalLink size={12} />
                                                </Link>
                                            )}

                                            {isUnread && (
                                                <button
                                                    onClick={() => handleMarkAsRead(notif.id || notif._id || '')}
                                                    className="ml-auto text-primary-600 hover:text-primary-700 font-semibold hover:underline flex items-center gap-1"
                                                >
                                                    <CheckCircle2 size={13} />
                                                    <span>Mark as read</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Notifications;
