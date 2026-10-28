import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Providers from '../components/Providers';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'VTStack - Modern Payment Infrastructure & Virtual Account System',
  description: 'Enterprise virtual accounts, wallets, payouts, and automated settlements for modern businesses.',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" />
      </head>
      <body className="bg-white text-gray-900 font-sans antialiased">
        <Providers>
          <Suspense fallback={null}>
            {children}
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
