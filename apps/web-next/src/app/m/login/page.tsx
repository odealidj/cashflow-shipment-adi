'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { 
  LogIn, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle, 
  Clock, 
  Monitor, 
  ShieldCheck 
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

function MobileLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warningMessage, setWarningMessage] = useState('');

  // If already authenticated with active user session, redirect to mobile beranda
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/m/beranda');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      setError('Sesi login Anda telah berakhir demi keamanan. Silakan login kembali.');
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setWarningMessage('');

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.message || 'Gagal masuk akun';
        if (msg.toLowerCase().includes('menunggu persetujuan') || msg.toLowerCase().includes('tidak aktif')) {
          setWarningMessage(msg);
          return;
        }
        throw new Error(msg);
      }

      if (data.data?.token) {
        localStorage.setItem('token', data.data.token);
      }
      if (data.data?.user) {
        localStorage.setItem('user', JSON.stringify(data.data.user));
        localStorage.setItem('transio_user_name', data.data.user.full_name);
      }

      // Smooth transition to mobile home
      router.replace('/m/beranda');
    } catch (err: any) {
      setError(err.message || 'Koneksi bermasalah atau akun tidak sesuai');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1C2B4A] via-[#223249] to-[#0F172A] flex flex-col justify-between p-4 text-white">
      {/* Top Header Branding */}
      <div className="pt-8 pb-4 flex flex-col items-center text-center animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-white p-2 flex items-center justify-center shadow-2xl border border-white/20 mb-3">
          <Image
            src="/logo.png"
            alt="Logo PT Adijayantara Logistics Indonesia"
            width={72}
            height={72}
            className="w-full h-full object-contain"
            priority
          />
        </div>
        <h1 className="text-xl font-black tracking-wider uppercase text-white">
          ADIJAYANTARA
        </h1>
        <p className="text-[11px] font-bold text-sky-300 tracking-widest uppercase mt-0.5">
          LOGISTICS INDONESIA
        </p>
        <span className="inline-block mt-2 px-3 py-0.5 bg-sky-950/80 text-sky-300 text-[10px] font-black tracking-widest rounded-full border border-sky-400/30">
          MOBILE EDITION (PWA)
        </span>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-sm mx-auto bg-white rounded-3xl p-6 text-slate-900 shadow-2xl border border-slate-100/90 animate-fade-in">
        <div className="mb-4">
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Masuk Akun</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Gunakan email atau nomor HP terdaftar
          </p>
        </div>

        {/* Alert Error */}
        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3 rounded-2xl flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Alert Warning (Approval required) */}
        {warningMessage && (
          <div className="mb-4 bg-amber-50 border border-amber-300 text-amber-900 text-xs p-3 rounded-2xl flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-amber-950">Menunggu Persetujuan</p>
              <p className="text-amber-800 text-[11px] leading-relaxed">{warningMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3.5">
          {/* Identifier Input */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 ml-1">
              Email atau Nomor Telepon
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                {identifier.includes('@') ? (
                  <Mail className="h-4 w-4 text-sky-600" />
                ) : (
                  <Phone className="h-4 w-4 text-sky-600" />
                )}
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-slate-900 text-xs font-semibold focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 focus:outline-none transition-all placeholder:text-slate-400"
                placeholder="nama@email.com / 0812..."
                required
                autoCapitalize="none"
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 ml-1">
              Kata Sandi (Password)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4 text-sky-600" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-10 text-slate-900 text-xs font-semibold focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 focus:outline-none transition-all placeholder:text-slate-400"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 active:scale-98 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30 transition-all cursor-pointer disabled:opacity-50 mt-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Memproses Masuk...</span>
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                <span>Masuk ke Aplikasi</span>
              </>
            )}
          </button>
        </form>

        {/* Quick hint for company staff */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Keamanan Terenkripsi PBAC & Sesi HttpOnly</span>
        </div>
      </div>

      {/* Switch to Desktop Version Button */}
      <div className="py-4 text-center space-y-2 max-w-sm mx-auto w-full">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/10 transition-colors cursor-pointer"
        >
          <Monitor className="w-4 h-4 text-sky-400" />
          <span>Buka Versi Desktop (Workstation)</span>
        </button>
        <p className="text-[10px] text-slate-400">
          PT. Adijayantara Logistics Indonesia © 2026
        </p>
      </div>
    </div>
  );
}

export default function MobileLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#1C2B4A] flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
      </div>
    }>
      <MobileLoginContent />
    </Suspense>
  );
}
