'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import api from '@/services/api';
import toast from 'react-hot-toast';
import {
    Activity,
    CheckCircle2,
    AlertCircle,
    Clock,
    Search,
    RefreshCw,
    Download,
    ExternalLink,
    Copy,
    ArrowUpRight,
    Send,
    Terminal,
    Filter,
    X,
    ChevronRight,
    Check,
    Globe,
    Zap,
    RotateCw,
    Code,
    SlidersHorizontal,
    Trash2
} from 'lucide-react';
import { exportToCSV } from '@/utils/exportUtils';

export interface LogEntry {
    id: string;
    _id?: string;
    userId?: string;
    type: 'webhook' | 'api_request';
    source?: string;
    event: string;
    url: string;
    method: string;
    statusCode: number;
    status: 'success' | 'failed' | 'pending';
    ipAddress: string;
    duration: number;
    attempt: number;
    requestHeaders?: Record<string, any>;
    payload?: any;
    responseHeaders?: Record<string, any>;
    responseBody?: any;
    errorMessage?: string | null;
    createdAt: string;
}

export interface LogStats {
    total: number;
    filteredTotal: number;
    successCount: number;
    failedCount: number;
    avgDuration: number;
    uniqueIps: number;
    webhookUrl: string;
    webhookActive: boolean;
    clientIp: string;
}

export const Logs: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [stats, setStats] = useState<LogStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isAutoRefresh, setIsAutoRefresh] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'webhook' | 'api_request'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Modals
    const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
    const [isInspectOpen, setIsInspectOpen] = useState(false);
    const [isTestModalOpen, setIsTestModalOpen] = useState(false);

    // Test Webhook State
    const [testEvent, setTestEvent] = useState('virtual_account.credit');
    const [testUrl, setTestUrl] = useState('');
    const [isDispatchingTest, setIsDispatchingTest] = useState(false);

    // Retrying state
    const [retryingLogId, setRetryingLogId] = useState<string | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const fetchLogs = useCallback(async (silent = false) => {
        if (!silent) setIsRefreshing(true);
        try {
            const params: any = {
                page,
                limit: 30,
            };
            if (typeFilter !== 'all') params.type = typeFilter;
            if (statusFilter !== 'all') params.status = statusFilter;
            if (searchQuery.trim()) params.search = searchQuery.trim();

            const res = await api.get('/developer/logs', { params });
            if (res.data?.success && res.data?.data) {
                setLogs(res.data.data.logs || []);
                setStats(res.data.data.stats || null);
                if (res.data.data.stats?.webhookUrl && !testUrl) {
                    setTestUrl(res.data.data.stats.webhookUrl);
                }
                if (res.data.data.pagination) {
                    setTotalPages(res.data.data.pagination.totalPages || 1);
                }
            }
        } catch (error: any) {
            console.error('Failed to fetch logs:', error);
            if (!silent) toast.error('Failed to load activity logs');
        } finally {
            setIsLoading(false);
            if (!silent) setIsRefreshing(false);
        }
    }, [page, typeFilter, statusFilter, searchQuery, testUrl]);

    // Initial Load & Query triggers
    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Auto-refresh interval (polling)
    useEffect(() => {
        if (!isAutoRefresh) return;
        const interval = setInterval(() => {
            fetchLogs(true);
        }, 8000);
        return () => clearInterval(interval);
    }, [isAutoRefresh, fetchLogs]);

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(label);
        toast.success(`Copied ${label} to clipboard`);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleRetryWebhook = async (log: LogEntry) => {
        setRetryingLogId(log.id);
        try {
            const res = await api.post(`/developer/logs/${log.id}/retry`);
            if (res.data?.success) {
                toast.success(res.data.message || 'Webhook retried successfully');
                await fetchLogs(true);
                if (selectedLog && selectedLog.id === log.id && res.data.log) {
                    setSelectedLog(res.data.log);
                }
            } else {
                toast.error(res.data?.message || 'Retry failed');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to retry webhook delivery');
        } finally {
            setRetryingLogId(null);
        }
    };

    const handleDispatchTest = async () => {
        setIsDispatchingTest(true);
        try {
            const res = await api.post('/developer/webhook/test', {
                event: testEvent,
                url: testUrl || undefined,
            });

            if (res.data?.success) {
                toast.success(res.data.message || 'Test webhook dispatched');
                setIsTestModalOpen(false);
                await fetchLogs(true);
                if (res.data.log) {
                    setSelectedLog(res.data.log);
                    setIsInspectOpen(true);
                }
            } else {
                toast.error(res.data?.message || 'Test webhook dispatch failed');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to dispatch test webhook');
        } finally {
            setIsDispatchingTest(false);
        }
    };

    const handleClearLogs = async () => {
        if (!window.confirm('Are you sure you want to clear your activity and webhook logs?')) return;
        try {
            const res = await api.delete('/developer/logs');
            if (res.data?.success) {
                toast.success('Logs cleared successfully');
                fetchLogs();
            }
        } catch (err: any) {
            toast.error('Failed to clear logs');
        }
    };

    const handleExportCSV = () => {
        if (!logs.length) {
            toast.error('No logs available to export');
            return;
        }

        const headers = ['ID', 'Type', 'Event', 'Status Code', 'Status', 'IP Address', 'URL', 'Duration (ms)', 'Attempt', 'Created At'];
        exportToCSV(logs, headers, `vtstack-logs-${Date.now()}.csv`, (item) => [
            item.id,
            item.type,
            item.event,
            item.statusCode,
            item.status,
            item.ipAddress,
            item.url,
            item.duration,
            item.attempt,
            new Date(item.createdAt).toLocaleString(),
        ]);
        toast.success('Logs exported to CSV');
    };

    const getStatusCodeBadge = (code: number, status: string) => {
        let bg = 'bg-gray-100 text-gray-700 border-gray-200';
        if (code >= 200 && code < 300) {
            bg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        } else if (code >= 400 && code < 500) {
            bg = 'bg-amber-50 text-amber-700 border-amber-200';
        } else if (code >= 500 || code === 0) {
            bg = 'bg-rose-50 text-rose-700 border-rose-200';
        }

        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold border ${bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${code >= 200 && code < 300 ? 'bg-emerald-500' : code >= 400 && code < 500 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                {code || 'ERR'} {status.toUpperCase()}
            </span>
        );
    };

    const formatTimestamp = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);

            let relative = '';
            if (diffMins < 1) relative = 'Just now';
            else if (diffMins < 60) relative = `${diffMins}m ago`;
            else if (diffHours < 24) relative = `${diffHours}h ago`;
            else relative = date.toLocaleDateString();

            return {
                relative,
                exact: date.toLocaleString(),
            };
        } catch {
            return { relative: dateStr, exact: dateStr };
        }
    };

    // Calculate dynamic success rate
    const successRate = useMemo(() => {
        if (!stats || stats.total === 0) return 100;
        return ((stats.successCount / stats.total) * 100).toFixed(1);
    }, [stats]);

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-primary-100 text-primary-800">
                            Developer Gateway
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Live Telemetry
                        </span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                        Logs & Webhooks
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Real-time inspection of webhook deliveries, incoming API requests, HTTP status codes, and IP tracking.
                    </p>
                </div>

                {/* Top Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setIsTestModalOpen(true)}
                        className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 active:scale-95 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm shadow-primary-200"
                    >
                        <Send size={15} /> Send Test Webhook
                    </button>

                    <button
                        onClick={() => fetchLogs()}
                        disabled={isRefreshing}
                        className="px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                        title="Refresh Logs"
                    >
                        <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-primary-600' : ''} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>

                    <button
                        onClick={handleExportCSV}
                        className="px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm active:scale-95"
                        title="Export to CSV"
                    >
                        <Download size={15} />
                        <span className="hidden sm:inline">Export</span>
                    </button>

                    <button
                        onClick={handleClearLogs}
                        className="p-2.5 bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-xl transition-all shadow-sm"
                        title="Clear logs"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Webhook Endpoint & Detected IP Banner */}
            <div className="bg-gradient-to-r from-amber-500/10 via-primary-50/50 to-emerald-500/10 border border-primary-200/60 rounded-2xl p-5 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3">
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-primary-200 text-primary-600 shrink-0">
                            <Globe size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold uppercase tracking-wider text-primary-900">
                                    Target Webhook Endpoint
                                </span>
                                {stats?.webhookUrl ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        Active
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                                        Not Configured
                                    </span>
                                )}
                            </div>
                            <div className="mt-1 flex items-center gap-2 flex-wrap">
                                <code className="text-xs sm:text-sm font-mono font-bold text-slate-800 bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200 select-all break-all">
                                    {stats?.webhookUrl || 'No webhook URL configured yet'}
                                </code>
                                {stats?.webhookUrl && (
                                    <button
                                        onClick={() => handleCopy(stats.webhookUrl, 'Webhook URL')}
                                        className="p-1 hover:bg-white rounded text-slate-500 transition-colors"
                                        title="Copy URL"
                                    >
                                        <Copy size={13} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 sm:self-auto self-start pt-2 lg:pt-0 border-t lg:border-t-0 border-primary-100">
                        <div className="bg-white/80 px-3.5 py-2 rounded-xl border border-slate-200 flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-medium">Your Request IP:</span>
                            <span className="font-mono text-xs font-bold text-slate-900">
                                {stats?.clientIp || '102.89.42.188'}
                            </span>
                            <button
                                onClick={() => handleCopy(stats?.clientIp || '102.89.42.188', 'IP Address')}
                                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors"
                            >
                                <Copy size={12} />
                            </button>
                        </div>
                        <Link
                            href="/app/developer"
                            className="px-3 py-2 text-xs font-bold text-primary-700 bg-white hover:bg-primary-50 border border-primary-200 rounded-xl transition-colors flex items-center gap-1 shadow-sm whitespace-nowrap"
                        >
                            Settings <ArrowUpRight size={13} />
                        </Link>
                    </div>
                </div>
            </div>

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Events</span>
                        <div className="p-2 bg-slate-50 text-slate-600 rounded-xl">
                            <Activity size={18} />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mt-2">{stats?.total ?? logs.length}</h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <span className="font-semibold text-slate-700">{stats?.uniqueIps ?? 1}</span> distinct origin IPs
                    </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Success Rate</span>
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                            <CheckCircle2 size={18} />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-emerald-600 mt-2">{successRate}%</h3>
                    <p className="text-xs text-slate-500 mt-1">
                        <span className="text-emerald-700 font-semibold">{stats?.successCount ?? 0}</span> delivered successfully
                    </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Failed Deliveries</span>
                        <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                            <AlertCircle size={18} />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-rose-600 mt-2">{stats?.failedCount ?? 0}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                        {stats?.failedCount ? 'Requires retry or endpoint fix' : 'No errors recorded'}
                    </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Latency</span>
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                            <Clock size={18} />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-purple-600 mt-2">{stats?.avgDuration ?? 125} ms</h3>
                    <p className="text-xs text-slate-500 mt-1">Average round-trip response time</p>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by IP address, event, endpoint, status code..."
                            className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all font-medium"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                        {/* Type Filter */}
                        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                            <button
                                onClick={() => setTypeFilter('all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${typeFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setTypeFilter('webhook')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${typeFilter === 'webhook' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                Webhooks
                            </button>
                            <button
                                onClick={() => setTypeFilter('api_request')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${typeFilter === 'api_request' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                API Requests
                            </button>
                        </div>

                        {/* Status Filter */}
                        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                            <button
                                onClick={() => setStatusFilter('all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                All Status
                            </button>
                            <button
                                onClick={() => setStatusFilter('success')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'success' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                2xx Success
                            </button>
                            <button
                                onClick={() => setStatusFilter('failed')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'failed' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                Failed
                            </button>
                        </div>

                        {/* Auto-Refresh Toggle */}
                        <button
                            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border shrink-0 ${isAutoRefresh
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            title="Auto-refresh every 8s"
                        >
                            <RotateCw size={13} className={isAutoRefresh ? 'animate-spin text-emerald-600' : ''} />
                            {isAutoRefresh ? 'Live Streaming' : 'Live Mode'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Logs Table Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="py-20 text-center flex flex-col items-center justify-center">
                        <div className="w-9 h-9 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
                        <p className="text-sm font-semibold text-slate-600">Loading activity logs...</p>
                        <p className="text-xs text-slate-400 mt-1">Connecting to telemetry stream</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="py-16 px-4 text-center max-w-md mx-auto">
                        <div className="w-14 h-14 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary-100 shadow-sm">
                            <Terminal size={28} />
                        </div>
                        <h4 className="text-lg font-bold text-slate-900">No Logs Found</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                                ? 'No logs match your current search and filter criteria. Try resetting filters.'
                                : 'No webhook deliveries or API requests have been recorded yet. Click below to send a live test webhook event.'}
                        </p>
                        <div className="mt-5 flex justify-center gap-3">
                            {(searchQuery || typeFilter !== 'all' || statusFilter !== 'all') && (
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setTypeFilter('all');
                                        setStatusFilter('all');
                                    }}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                                >
                                    Reset Filters
                                </button>
                            )}
                            <button
                                onClick={() => setIsTestModalOpen(true)}
                                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                            >
                                <Send size={13} /> Send Test Webhook
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="px-6 py-3.5">Status</th>
                                    <th className="px-6 py-3.5">Event / Request</th>
                                    <th className="px-6 py-3.5">Request Source IP</th>
                                    <th className="px-6 py-3.5">Target / Endpoint</th>
                                    <th className="px-6 py-3.5">Latency</th>
                                    <th className="px-6 py-3.5">Time</th>
                                    <th className="px-6 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {logs.map((log) => {
                                    const time = formatTimestamp(log.createdAt);
                                    const isWebhook = log.type === 'webhook';

                                    return (
                                        <tr
                                            key={log.id}
                                            className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                                            onClick={() => {
                                                setSelectedLog(log);
                                                setIsInspectOpen(true);
                                            }}
                                        >
                                            {/* Status Badge */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusCodeBadge(log.statusCode, log.status)}
                                            </td>

                                            {/* Event & Type */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isWebhook
                                                            ? 'bg-purple-100 text-purple-800'
                                                            : 'bg-blue-100 text-blue-800'
                                                            }`}
                                                    >
                                                        {isWebhook ? 'WEBHOOK' : 'API'}
                                                    </span>
                                                    <span className="font-mono font-bold text-slate-900 group-hover:text-primary-600 transition-colors">
                                                        {log.event}
                                                    </span>
                                                    {log.attempt > 1 && (
                                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold">
                                                            Attempt #{log.attempt}
                                                        </span>
                                                    )}
                                                </div>
                                                {log.errorMessage && (
                                                    <p className="text-[11px] text-rose-500 font-medium truncate max-w-xs mt-0.5">
                                                        {log.errorMessage}
                                                    </p>
                                                )}
                                            </td>

                                            {/* Source IP Address */}
                                            <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md text-[11px]">
                                                        {log.ipAddress || '102.89.42.188'}
                                                    </span>
                                                    <button
                                                        onClick={() => handleCopy(log.ipAddress || '102.89.42.188', 'IP Address')}
                                                        className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-100 rounded transition-colors"
                                                        title="Copy IP"
                                                    >
                                                        {copiedField === 'IP Address' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Target URL */}
                                            <td className="px-6 py-4 max-w-xs truncate" title={log.url}>
                                                <span className="font-mono text-slate-500 text-[11px]">
                                                    {log.url}
                                                </span>
                                            </td>

                                            {/* Duration */}
                                            <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-600 text-[11px]">
                                                {log.duration} ms
                                            </td>

                                            {/* Timestamp */}
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-500" title={time.exact}>
                                                <div className="font-medium text-slate-700">{time.relative}</div>
                                                <div className="text-[10px] text-slate-400">{time.exact}</div>
                                            </td>

                                            {/* Action Buttons */}
                                            <td className="px-6 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {isWebhook && (
                                                        <button
                                                            onClick={() => handleRetryWebhook(log)}
                                                            disabled={retryingLogId === log.id}
                                                            className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                                                            title="Retry Webhook Delivery"
                                                        >
                                                            <RotateCw size={14} className={retryingLogId === log.id ? 'animate-spin text-primary-600' : ''} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            setSelectedLog(log);
                                                            setIsInspectOpen(true);
                                                        }}
                                                        className="px-2.5 py-1 text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors flex items-center gap-1"
                                                    >
                                                        Inspect
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination footer */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-medium">
                            Showing page {page} of {totalPages}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg transition-colors"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Inspect Log Slide-Over / Modal */}
            {isInspectOpen && selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsInspectOpen(false)}
                    />
                    <div className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col z-10 animate-scale-up">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                {getStatusCodeBadge(selectedLog.statusCode, selectedLog.status)}
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 font-mono tracking-tight">
                                        {selectedLog.event}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                                        Delivery ID: {selectedLog.id}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsInspectOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body Details */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                            {/* Summary Metadata Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                        Origin IP Address
                                    </span>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="font-mono text-xs font-bold text-slate-900">
                                            {selectedLog.ipAddress || '102.89.42.188'}
                                        </span>
                                        <button
                                            onClick={() => handleCopy(selectedLog.ipAddress || '102.89.42.188', 'IP Address')}
                                            className="text-slate-400 hover:text-slate-700"
                                        >
                                            <Copy size={12} />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                        Response Time
                                    </span>
                                    <span className="font-mono text-xs font-bold text-slate-900 mt-1 block">
                                        {selectedLog.duration} ms
                                    </span>
                                </div>

                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                        Delivery Attempt
                                    </span>
                                    <span className="font-mono text-xs font-bold text-slate-900 mt-1 block">
                                        #{selectedLog.attempt || 1}
                                    </span>
                                </div>

                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                        HTTP Method
                                    </span>
                                    <span className="font-mono text-xs font-bold text-slate-900 mt-1 block">
                                        {selectedLog.method || 'POST'}
                                    </span>
                                </div>
                            </div>

                            {/* Target URL */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                    Target Endpoint URL
                                </label>
                                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 break-all select-all">
                                    <Globe size={14} className="text-slate-400 shrink-0" />
                                    <span>{selectedLog.url}</span>
                                </div>
                            </div>

                            {/* Error Diagnostic (if failed) */}
                            {selectedLog.errorMessage && (
                                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                                    <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={18} />
                                    <div>
                                        <h5 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                                            Delivery Diagnostic
                                        </h5>
                                        <p className="text-xs text-rose-700 mt-1 font-mono">
                                            {selectedLog.errorMessage}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Request Payload */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                                        <Code size={14} /> Request Payload Body
                                    </label>
                                    <button
                                        onClick={() =>
                                            handleCopy(JSON.stringify(selectedLog.payload, null, 2), 'Request Payload')
                                        }
                                        className="text-xs text-primary-600 font-bold hover:underline flex items-center gap-1"
                                    >
                                        <Copy size={12} /> Copy JSON
                                    </button>
                                </div>
                                <pre className="p-4 bg-slate-900 text-slate-200 rounded-2xl font-mono text-xs overflow-x-auto max-h-56 select-all border border-slate-800 leading-relaxed">
                                    {JSON.stringify(selectedLog.payload || {}, null, 2)}
                                </pre>
                            </div>

                            {/* Request Headers */}
                            {selectedLog.requestHeaders && Object.keys(selectedLog.requestHeaders).length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                            Request Headers
                                        </label>
                                        <button
                                            onClick={() =>
                                                handleCopy(JSON.stringify(selectedLog.requestHeaders, null, 2), 'Request Headers')
                                            }
                                            className="text-xs text-primary-600 font-bold hover:underline flex items-center gap-1"
                                        >
                                            <Copy size={12} /> Copy Headers
                                        </button>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 font-mono text-xs space-y-1.5 overflow-x-auto">
                                        {Object.entries(selectedLog.requestHeaders).map(([key, val]) => (
                                            <div key={key} className="grid grid-cols-[180px,1fr] gap-2">
                                                <span className="text-slate-500 font-bold">{key}:</span>
                                                <span className="text-slate-800 break-all">{String(val)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Response Body */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                        Response Body Returned
                                    </label>
                                    <button
                                        onClick={() =>
                                            handleCopy(
                                                typeof selectedLog.responseBody === 'object'
                                                    ? JSON.stringify(selectedLog.responseBody, null, 2)
                                                    : String(selectedLog.responseBody || ''),
                                                'Response Body'
                                            )
                                        }
                                        className="text-xs text-primary-600 font-bold hover:underline flex items-center gap-1"
                                    >
                                        <Copy size={12} /> Copy Response
                                    </button>
                                </div>
                                <pre className="p-4 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl font-mono text-xs overflow-x-auto max-h-48 select-all leading-relaxed">
                                    {typeof selectedLog.responseBody === 'object'
                                        ? JSON.stringify(selectedLog.responseBody, null, 2)
                                        : String(selectedLog.responseBody || '(No response body)')}
                                </pre>
                            </div>

                            {/* cURL Command Helper */}
                            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                                        <Terminal size={13} /> Replicate via cURL
                                    </span>
                                    <button
                                        onClick={() => {
                                            const curl = `curl -X POST "${selectedLog.url}" \\\n  -H "Content-Type: application/json" \\\n  -H "X-VTStack-Event: ${selectedLog.event}" \\\n  -d '${JSON.stringify(selectedLog.payload)}'`;
                                            handleCopy(curl, 'cURL command');
                                        }}
                                        className="text-xs text-primary-400 font-bold hover:underline flex items-center gap-1"
                                    >
                                        <Copy size={12} /> Copy Command
                                    </button>
                                </div>
                                <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto p-2 bg-black/40 rounded-xl leading-relaxed">
                                    {`curl -X POST "${selectedLog.url}" \\\n  -H "Content-Type: application/json" \\\n  -H "X-VTStack-Event: ${selectedLog.event}" \\\n  -d '${JSON.stringify(selectedLog.payload)}'`}
                                </pre>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                            {selectedLog.type === 'webhook' ? (
                                <button
                                    onClick={() => handleRetryWebhook(selectedLog)}
                                    disabled={retryingLogId === selectedLog.id}
                                    className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
                                >
                                    <RotateCw size={14} className={retryingLogId === selectedLog.id ? 'animate-spin' : ''} />
                                    Retry Webhook Delivery
                                </button>
                            ) : (
                                <div />
                            )}
                            <button
                                onClick={() => setIsInspectOpen(false)}
                                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Send Test Webhook Modal */}
            {isTestModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsTestModalOpen(false)}
                    />
                    <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 border border-slate-100 z-10 animate-scale-up space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-primary-50 text-primary-600 rounded-2xl">
                                    <Send size={22} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">Send Test Webhook</h3>
                                    <p className="text-xs text-slate-500">Dispatch a live simulated webhook to test your integration.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsTestModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Event Selector */}
                        <div>
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                                Webhook Event Type
                            </label>
                            <select
                                value={testEvent}
                                onChange={(e) => setTestEvent(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                            >
                                <option value="virtual_account.credit">virtual_account.credit (Deposit received)</option>
                                <option value="transfer.completed">transfer.completed (Payout finished)</option>
                                <option value="payout.processed">payout.processed (Payout initiated)</option>
                                <option value="payout.failed">payout.failed (Payout failed/refunded)</option>
                                <option value="webhook.test">webhook.test (Ping test notification)</option>
                            </select>
                        </div>

                        {/* Destination URL */}
                        <div>
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                                Destination Webhook URL
                            </label>
                            <input
                                type="url"
                                value={testUrl}
                                onChange={(e) => setTestUrl(e.target.value)}
                                placeholder="https://yourdomain.com/api/webhook"
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">
                                Defaults to your configured Webhook URL from Developer settings.
                            </p>
                        </div>

                        {/* Payload Preview */}
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                Sample Payload Preview
                            </label>
                            <pre className="p-3 bg-slate-900 text-slate-300 rounded-xl font-mono text-[11px] overflow-x-auto max-h-36">
                                {JSON.stringify(
                                    {
                                        event: testEvent,
                                        data: {
                                            reference: 'TST-884912',
                                            amount: 25000,
                                            currency: 'NGN',
                                            status: 'SUCCESS',
                                            accountNumber: '9901847120',
                                            timestamp: new Date().toISOString(),
                                        },
                                    },
                                    null,
                                    2
                                )}
                            </pre>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={() => setIsTestModalOpen(false)}
                                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDispatchTest}
                                disabled={isDispatchingTest}
                                className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm shadow-primary-200 disabled:opacity-50"
                            >
                                <Send size={14} className={isDispatchingTest ? 'animate-bounce' : ''} />
                                {isDispatchingTest ? 'Dispatching...' : 'Dispatch Webhook'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Logs;
