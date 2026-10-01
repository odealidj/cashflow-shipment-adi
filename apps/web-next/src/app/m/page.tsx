'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function MobileIndex() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // If user is authenticated, check if PIN lock is explicitly enabled
        const pinLockEnabled = localStorage.getItem('transio_pin_lock_enabled') === 'true';
        const sessionUnlocked = sessionStorage.getItem('transio_pin_authenticated') === 'true';

        if (pinLockEnabled && !sessionUnlocked) {
          router.replace('/m/pin');
        } else {
          router.replace('/m/beranda');
        }
      } else {
        router.replace('/m/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-[#1C2B4A] via-[#223249] to-[#0F172A] text-white p-4">
      <div className="p-3 rounded-3xl bg-white shadow-2xl shadow-black/50 animate-pulse">
        <Image
          src="/logo.png"
          alt="Adijayantara Logistics Logo"
          width={84}
          height={84}
          className="rounded-2xl object-contain"
          priority
        />
      </div>
      <h1 className="text-xl font-black tracking-wider uppercase mt-5">ADIJAYANTARA</h1>
      <p className="text-xs text-sky-300 font-bold tracking-widest mt-1">LOGISTICS INDONESIA</p>
      <p className="text-[11px] text-sky-200/70 font-medium mt-0.5">Cashflow & Shipment Control</p>

      <div className="mt-8 flex items-center gap-2 text-xs text-sky-300/80 font-semibold">
        <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
        <span>Memuat aplikasi...</span>
      </div>
    </div>
  );
}
