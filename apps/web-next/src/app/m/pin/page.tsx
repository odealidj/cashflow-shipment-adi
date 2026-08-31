'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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
    <div className="min-h-screen bg-[#223249]">
      <NumpadPin
        title="ADIJAYANTARA"
        subtitle="Masukkan PIN untuk membuka"
        onComplete={handleComplete}
        onResetPin={handleReset}
        error={error}
      />
    </div>
  );
}
