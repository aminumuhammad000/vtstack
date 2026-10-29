import Link from 'next/link';
import { Home, ArrowLeft, Mail, Phone, MessageSquare, HelpCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex flex-col justify-between text-slate-800">
      {/* Top Header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="VTStack" className="h-9 w-auto" />
          </Link>
          <Link
            href="/"
            className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-primary-600 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to VTStack.ng
          </Link>
        </div>
      </header>

      {/* Main 404 Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full text-center space-y-8 animate-fade-in">
          {/* Badge & Number */}
          <div className="space-y-2">
            <span className="inline-block px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-primary-700 bg-primary-50 border border-primary-200 rounded-full">
              Error 404
            </span>
            <h1 className="text-7xl sm:text-9xl font-black text-slate-900 tracking-tight">
              4<span className="text-primary-600">0</span>4
            </h1>
          </div>

          {/* Heading & Subtitle */}
          <div className="space-y-3 max-w-lg mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Page Not Found
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Sorry, we couldn&apos;t find the page you were looking for. It may have been moved, renamed, or does not exist.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all"
            >
              <Home size={18} />
              Back to Home
            </Link>
            <Link
              href="/app"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-800 rounded-xl font-bold text-sm shadow-sm hover:bg-slate-50 transition-all"
            >
              Open Dashboard
            </Link>
          </div>

          {/* Support Contacts Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm text-left max-w-xl mx-auto mt-8">
            <div className="flex items-center gap-2.5 mb-4 text-slate-900 font-bold text-base border-b border-slate-100 pb-3">
              <HelpCircle size={20} className="text-primary-600" />
              Need Assistance? Contact Our Support Team
            </div>
            
            <p className="text-xs text-slate-500 mb-5">
              If you believe this is an error or need direct help with your payments or integration, reach out through our official channels:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Email */}
              <a
                href="mailto:support@vtstack.ng"
                className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-primary-50 hover:border-primary-200 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Mail size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500 font-medium">Email Support</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-primary-700 truncate">
                    support@vtstack.ng
                  </p>
                </div>
              </a>

              {/* WhatsApp / Phone */}
              <a
                href="https://wa.me/2348024230597"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-green-50 hover:border-green-200 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-green-100 text-green-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Phone size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500 font-medium">WhatsApp / Call</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-green-700 truncate">
                    08024230597
                  </p>
                </div>
              </a>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Official Website: <strong className="text-slate-700">vtstack.ng</strong></span>
              <Link href="/contact" className="text-primary-600 font-semibold hover:underline">
                Contact Page &rarr;
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-200/60 bg-white">
        &copy; {new Date().getFullYear()} VTStack Systems (vtstack.ng). All rights reserved.
      </footer>
    </div>
  );
}
