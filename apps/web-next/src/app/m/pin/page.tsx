'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';
import { NumpadPin } from '@/components/mobile/NumpadPin';
import { usePinAuth } from '@/hooks/usePinAuth';

export default function PinLockPage() {
  const router = useRouter();
  const { verifyPin, resetPinToDefault } = usePinAuth();
  const [error, setError] = useState<string | null>(null);

  const handleComplete = (enteredPin: string) => {
    setError(null);
    const valid = verifyPin(enteredPin);
    if (valid) {
      router.replace('/m/beranda');
    } else {
      setError('PIN salah. Silakan coba lagi.');
    }
  };

  const handleReset = () => {
    if (confirm('Reset PIN ke default (123456)?')) {
      resetPinToDefault();
      alert('PIN berhasil direset ke 123456');
    }
  };

  return (
    <div className="min-h-screen bg-[#1C2B4A] flex flex-col justify-between">
      <div className="flex-1">
        <NumpadPin
          title="ADIJAYANTARA"
          subtitle="Masukkan PIN untuk membuka"
          onComplete={handleComplete}
          onResetPin={handleReset}
          error={error}
        />
      </div>

      <div className="pb-8 pt-2 px-6 text-center">
        <button
          type="button"
          onClick={() => router.replace('/m/login')}
          className="inline-flex items-center gap-2 text-xs font-bold text-sky-300 hover:text-white transition-colors cursor-pointer py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Masuk dengan Email & Password</span>
        </button>
      </div>
    </div>
  );
}
