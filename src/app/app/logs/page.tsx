'use client';

import dynamic from 'next/dynamic';

const Logs = dynamic(() => import('@/pages-legacy/user/dashboard/Logs'), {
  ssr: false,
  loading: () => (
    <div className="py-20 text-center flex flex-col items-center justify-center">
      <div className="w-9 h-9 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-sm font-semibold text-slate-600">Loading activity logs...</p>
      <p className="text-xs text-slate-400 mt-1">Connecting to telemetry stream</p>
    </div>
  ),
});

export default function LogsPage() {
  return <Logs />;
}
