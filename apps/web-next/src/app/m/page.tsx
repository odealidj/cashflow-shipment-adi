'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { usePinAuth } from '@/hooks/usePinAuth';

export default function MobileIndex() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = usePinAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/m/beranda');
      } else {
        router.replace('/m/pin');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#1C2B4A] text-white p-4">
      <div className="p-2 rounded-2xl bg-white shadow-2xl shadow-black/50 animate-pulse">
        <Image
          src="/logo.png"
          alt="Adijayantara Logistics Logo"
          width={80}
          height={80}
          className="rounded-xl object-contain"
          priority
        />
      </div>
      <h1 className="text-xl font-black tracking-wider uppercase mt-4">ADIJAYANTARA</h1>
      <p className="text-xs text-blue-200 font-bold tracking-widest mt-1">LOGISTICS INDONESIA</p>
      <p className="text-[10px] text-blue-300/70 font-medium mt-0.5">Cashflow & Shipment Control</p>
    </div>
  );
}
