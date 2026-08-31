import React from 'react';
import type { Metadata, Viewport } from 'next';
import { BottomNav } from '@/components/mobile/BottomNav';

export const metadata: Metadata = {
  title: 'Adijayantara - Shipment & Cashflow Control',
  description: 'Aplikasi Manajemen Cashflow & Shipment Operasional PT. Adijayantara Logistics Indonesia',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Adijayantara',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#1C2B4A',
};

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-900 flex justify-center text-slate-900 font-sans antialiased">
      {/* Mobile Device Container (Max 480px on desktop with shadow frame, full width on mobile) */}
      <div className="w-full max-w-md min-h-screen bg-[#F8FAFC] shadow-2xl flex flex-col relative overflow-x-hidden">
        {/* Main Content Area */}
        <main className="flex-1 pb-20">{children}</main>

        {/* Floating / Fixed Bottom Navigation Bar */}
        <BottomNav />
      </div>
    </div>
  );
}
