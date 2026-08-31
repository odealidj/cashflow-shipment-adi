'use client';

import React, { useState } from 'react';
import { Delete, RotateCcw, Lock } from 'lucide-react';
import Image from 'next/image';

interface NumpadPinProps {
  onComplete: (pin: string) => void;
  onResetPin?: () => void;
  error?: string | null;
  title?: string;
  subtitle?: string;
}

export const NumpadPin: React.FC<NumpadPinProps> = ({
  onComplete,
  onResetPin,
  error = null,
  title = 'ADIJAYANTARA',
  subtitle = 'Masukkan PIN untuk membuka',
}) => {
  const [pin, setPin] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 6) {
        onComplete(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleReset = () => {
    setPin('');
    if (onResetPin) onResetPin();
  };

  // Trigger shake animation when error happens
  React.useEffect(() => {
    if (error) {
      setIsShaking(true);
      const timer = setTimeout(() => {
        setIsShaking(false);
        setPin('');
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const digits = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['reset', '0', 'backspace'],
  ];

  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-[#1C2B4A] text-white px-6 py-8 select-none">
      {/* Top Branding */}
      <div className="flex flex-col items-center gap-2 mt-2 text-center">
        <div className="p-1.5 rounded-2xl bg-white shadow-xl shadow-black/40">
          <Image
            src="/logo.png"
            alt="Adijayantara Logo"
            width={60}
            height={60}
            className="rounded-xl object-contain"
            priority
          />
        </div>
        <h1 className="text-lg font-black tracking-wider uppercase mt-1">{title}</h1>
        <p className="text-xs text-blue-200 font-semibold tracking-wider">LOGISTICS INDONESIA</p>
        <p className="text-[11px] text-slate-300 font-medium">{subtitle}</p>
      </div>

      {/* 6-Dot Indicator */}
      <div className={`flex items-center gap-3.5 my-6 ${isShaking ? 'animate-bounce' : ''}`}>
        {[0, 1, 2, 3, 4, 5].map((idx) => {
          const isFilled = idx < pin.length;
          return (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                isFilled
                  ? 'bg-blue-400 scale-110 shadow-md shadow-blue-400/50'
                  : 'border-2 border-slate-400 bg-transparent'
              }`}
            />
          );
        })}
      </div>

      {/* Error Message if any */}
      {error && <p className="text-rose-400 text-xs font-semibold -mt-3 mb-2">{error}</p>}

      {/* 3x4 Numpad */}
      <div className="w-full max-w-xs grid grid-cols-3 gap-4 mb-6">
        {digits.flat().map((item, idx) => {
          if (item === 'reset') {
            return (
              <button
                key={idx}
                type="button"
                onClick={handleReset}
                className="w-16 h-16 mx-auto rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
                title="Reset PIN"
                aria-label="Reset PIN"
              >
                <div className="flex flex-col items-center">
                  <RotateCcw className="w-5 h-5" />
                  <Lock className="w-2.5 h-2.5 -mt-0.5" />
                </div>
              </button>
            );
          }

          if (item === 'backspace') {
            return (
              <button
                key={idx}
                type="button"
                onClick={handleBackspace}
                className="w-16 h-16 mx-auto rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
                aria-label="Hapus digit"
              >
                <Delete className="w-5 h-5" />
              </button>
            );
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleDigit(item)}
              className="w-16 h-16 mx-auto rounded-full bg-white/10 hover:bg-white/20 active:bg-blue-600 active:scale-95 text-white font-extrabold text-2xl flex items-center justify-center shadow-xs transition-all cursor-pointer"
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
};
