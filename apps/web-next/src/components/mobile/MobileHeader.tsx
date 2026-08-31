'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Bell, ArrowLeft, Check } from 'lucide-react';

interface MobileHeaderProps {
  title?: string;
  variant?: 'light' | 'dark' | 'transparent';
  showBack?: boolean;
  backUrl?: string;
  showSave?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
  notificationCount?: number;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title = 'Adijayantara',
  variant = 'light',
  showBack = false,
  backUrl = '/m/beranda',
  showSave = false,
  onSave,
  isSaving = false,
  notificationCount = 1,
}) => {
  if (variant === 'dark') {
    return (
      <header className="sticky top-0 z-40 bg-[#223249] text-white px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {showBack ? (
            <Link
              href={backUrl}
              className="p-1 -ml-1 text-white/90 hover:text-white transition-colors"
              aria-label="Kembali"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
          ) : null}
          <h1 className="text-base font-extrabold tracking-wide">{title}</h1>
        </div>

        {showSave && onSave ? (
          <button
            onClick={onSave}
            disabled={isSaving}
            className="p-1.5 text-white/90 hover:text-white transition-colors disabled:opacity-50"
            aria-label="Simpan"
          >
            <Check className="w-6 h-6 stroke-[2.5]" />
          </button>
        ) : null}
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-2.5 flex items-center justify-between shadow-2xs">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 p-0.5 flex items-center justify-center shadow-xs shrink-0">
          <Image
            src="/logo.png"
            alt="Adijayantara Logo"
            width={28}
            height={28}
            className="object-contain"
          />
        </div>
        <div className="flex flex-col">
          <span className="font-black text-slate-900 text-sm tracking-tight leading-tight uppercase">Adijayantara</span>
          <span className="text-[9px] font-bold text-blue-600 tracking-wider leading-none">LOGISTICS</span>
        </div>
      </div>

      <Link
        href="/m/tagihan"
        className="relative p-2 text-slate-600 hover:text-slate-900 transition-colors"
        aria-label="Notifikasi"
      >
        <Bell className="w-5 h-5" />
        {notificationCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm animate-pulse">
            {notificationCount}
          </span>
        )}
      </Link>
    </header>
  );
};
