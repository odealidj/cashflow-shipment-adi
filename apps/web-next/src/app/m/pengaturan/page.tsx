'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Lock, 
  Store, 
  Users, 
  Download, 
  Upload, 
  ChevronRight, 
  Monitor, 
  LogOut, 
  ShieldCheck, 
  Phone, 
  Mail, 
  Loader2, 
  X, 
  KeyRound, 
  Check, 
  CheckCircle2 
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePinAuth } from '@/hooks/usePinAuth';

const ROLE_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  super_admin: { label: 'Super Admin IT', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  admin: { label: 'Administrator', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  finance: { label: 'Finance & Kasir', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  operator: { label: 'Staff Operasional', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  direktur: { label: 'Direksi Eksekutif', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  owner: { label: 'Komisaris / Owner', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  viewer: { label: 'Auditor / Viewer', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
};

export default function PengaturanPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { updatePin, resetPinToDefault } = usePinAuth();

  // State
  const [isUploading, setIsUploading] = useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Quick PIN lock toggle
  const [pinLockEnabled, setPinLockEnabled] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/m/login');
    }
    const storedPinSetting = localStorage.getItem('transio_pin_lock_enabled') === 'true';
    setPinLockEnabled(storedPinSetting);
  }, [user, authLoading, router]);

  const handleTogglePinLock = () => {
    const nextVal = !pinLockEnabled;
    setPinLockEnabled(nextVal);
    localStorage.setItem('transio_pin_lock_enabled', String(nextVal));
    if (nextVal) {
      alert('Kunci Layar PIN telah diaktifkan untuk keamanan saat membuka aplikasi.');
    } else {
      alert('Kunci Layar PIN dinonaktifkan.');
    }
  };

  const handleUbahPin = () => {
    const newPin = prompt('Masukkan 6-digit PIN baru:');
    if (newPin) {
      if (updatePin(newPin)) {
        alert('PIN keamanan berhasil diperbarui!');
      } else {
        alert('PIN harus berupa 6 digit angka!');
      }
    }
  };

  const handleExportExcel = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const url = `/api/v1/cashflow/export${token ? `?token=${token}` : ''}`;
    window.open(url, '_blank');
  };

  const handleImportExcelClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsUploading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/cashflow/import', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.status) {
        alert('File Excel berhasil diimpor! Data transaksi dan saldo telah diperbarui.');
      } else {
        alert('Gagal mengimpor Excel: ' + (data.message || 'Format tidak sesuai'));
      }
    } catch (err: any) {
      alert('Gagal mengimpor file: ' + (err.message || 'Koneksi bermasalah'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleOpenVendors = async () => {
    setIsVendorModalOpen(true);
    setLoadingVendors(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/vendors?limit=200', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (data.status && data.data) {
        setVendors(Array.isArray(data.data) ? data.data : (data.data.entries || []));
      }
    } catch (err) {
      console.error('Failed to load vendors', err);
    } finally {
      setLoadingVendors(false);
    }
  };

  const handleOpenCustomers = async () => {
    setIsCustomerModalOpen(true);
    setLoadingCustomers(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/customers?limit=200', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (data.status && data.data) {
        setCustomers(Array.isArray(data.data) ? data.data : (data.data.entries || []));
      }
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Apakah Anda yakin ingin keluar dari akun ini?')) {
      await logout();
      router.replace('/m/login');
    }
  };

  const userRoleInfo = user?.role ? ROLE_BADGES[user.role] : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pengaturan</h1>
        <p className="text-[13px] text-slate-500 font-medium">Profil, data operasional, dan akses aplikasi</p>
      </div>

      <div className="px-4 py-3 space-y-4">
        {/* IDENTITAS PERUSAHAAN */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-xs">
            <Image
              src="/logo.png"
              alt="Logo Adijayantara"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase truncate">
              PT. Adijayantara Logistics
            </h2>
            <p className="text-[11px] font-bold text-sky-700 tracking-wide uppercase">
              Logistics Indonesia
            </p>
            <p className="text-[10px] text-slate-400 font-medium truncate">
              Sistem Buku Kas & Pelacakan Shipment
            </p>
          </div>
        </div>

        {/* GRUP 1: PROFIL PENGGUNA RESMI */}
        <div className="space-y-1.5">
          <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider px-1">
            Profil Pengguna Aktif
          </span>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#1C2B4A] to-sky-700 text-white flex items-center justify-center text-sm font-black shadow-md">
                  {(user?.full_name?.slice(0, 2) || 'AD').toUpperCase()}
                </div>
                <div>
                  <h3 className="text-[15px] font-black text-slate-900 leading-snug">
                    {user?.full_name || 'Memuat...'}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {userRoleInfo && (
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${userRoleInfo.bg} ${userRoleInfo.text} ${userRoleInfo.border}`}>
                        {userRoleInfo.label}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      AKTIF
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-800">{user?.email || '-'}</span>
              </div>
              {user?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-800">{user.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* GRUP 2: KEAMANAN PIN */}
        <div className="space-y-1.5">
          <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider px-1">
            Keamanan Perangkat
          </span>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100 overflow-hidden">
            {/* Toggle PIN Lock */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-slate-900">Kunci Layar PIN</h4>
                  <p className="text-[11px] text-slate-500">Minta PIN saat membuka aplikasi di HP</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTogglePinLock}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  pinLockEnabled ? 'bg-sky-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform absolute top-0.5 ${
                    pinLockEnabled ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Ubah PIN */}
            <button
              onClick={handleUbahPin}
              className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-slate-900">Ubah 6-Digit PIN</h4>
                  <p className="text-[11px] text-slate-500">Ganti PIN keamanan perangkat Anda</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* GRUP 3: MASTER DATA */}
        <div className="space-y-1.5">
          <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider px-1">
            Master Data Operasional
          </span>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100 overflow-hidden">
            {/* Manajemen Vendor */}
            <button
              onClick={handleOpenVendors}
              className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-slate-900">Daftar Rekanan Vendor</h4>
                  <p className="text-[11px] text-slate-500">Lihat vendor transporter & kontak PIC</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>

            {/* Manajemen Customer */}
            <button
              onClick={handleOpenCustomers}
              className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-slate-900">Daftar Pelanggan (Customer)</h4>
                  <p className="text-[11px] text-slate-500">Lihat data pelanggan & tagihan piutang</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* GRUP 4: FILE & EXCEL */}
        <div className="space-y-1.5">
          <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider px-1">
            Ekspor & Impor Data
          </span>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100 overflow-hidden">
            {/* Hidden Excel File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls"
              className="hidden"
            />

            {/* Ekspor Excel */}
            <button
              onClick={handleExportExcel}
              className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-slate-900">Ekspor Kas (Excel .xlsx)</h4>
                  <p className="text-[11px] text-slate-500">Unduh seluruh buku kas transaksi</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>

            {/* Impor Excel */}
            <button
              onClick={handleImportExcelClick}
              disabled={isUploading}
              className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-slate-900">
                    {isUploading ? 'Mengunggah Excel...' : 'Impor Data (Excel)'}
                  </h4>
                  <p className="text-[11px] text-slate-500">Perbarui kas dari template Excel</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Beralih ke Desktop Version */}
        <div className="pt-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3.5 rounded-2xl bg-[#1C2B4A] hover:bg-[#223249] text-white font-extrabold text-[13px] flex items-center justify-center gap-2.5 shadow-lg shadow-slate-900/20 active:scale-98 transition-all cursor-pointer"
          >
            <Monitor className="w-4 h-4 text-sky-400" />
            <span>Buka Versi Desktop (Workstation ERP)</span>
          </button>
        </div>

        {/* Tombol Logout Resmi */}
        <div>
          <button
            onClick={handleLogout}
            className="w-full py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-[13px] flex items-center justify-center gap-2 border border-rose-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Akun (Logout)</span>
          </button>
        </div>

        {/* Footer App Info */}
        <div className="text-center pt-4 pb-2 space-y-1 text-slate-400">
          <p className="text-[12px] font-bold text-slate-700">PT. Adijayantara Logistics Indonesia</p>
          <p className="text-[10px] text-slate-500 font-medium">Sistem Cashflow & Shipment Control • PWA v1.0.3</p>
          <p className="text-[9px] text-slate-400 pt-0.5">© 2026 PT. Adijayantara Logistics Indonesia</p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: DAFTAR VENDOR (MOBILE VIEW)                       */}
      {/* ======================================================== */}
      {isVendorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-5 space-y-4 shadow-2xl border-t border-slate-100 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-sky-700" />
                <h3 className="font-extrabold text-slate-900 text-base">Daftar Rekanan Vendor</h3>
              </div>
              <button 
                onClick={() => setIsVendorModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 py-1">
              {loadingVendors ? (
                <div className="py-12 text-center text-slate-400 text-xs font-semibold flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-sky-700" />
                  <span>Memuat vendor...</span>
                </div>
              ) : vendors.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Belum ada vendor terdaftar.
                </div>
              ) : (
                vendors.map((v) => (
                  <div key={v.id} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-extrabold text-slate-900">{v.name || v.vendor_name}</h4>
                      <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
                        ID: #{v.id}
                      </span>
                    </div>
                    {v.contact_person && (
                      <p className="text-[11px] text-slate-500">PIC: {v.contact_person}</p>
                    )}
                    {v.phone && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{v.phone}</span>
                      </div>
                    )}
                    {v.email && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{v.email}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setIsVendorModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors shrink-0 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: DAFTAR CUSTOMER (MOBILE VIEW)                     */}
      {/* ======================================================== */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-5 space-y-4 shadow-2xl border-t border-slate-100 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Daftar Pelanggan (Customer)</h3>
              </div>
              <button 
                onClick={() => setIsCustomerModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 py-1">
              {loadingCustomers ? (
                <div className="py-12 text-center text-slate-400 text-xs font-semibold flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                  <span>Memuat pelanggan...</span>
                </div>
              ) : customers.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Belum ada data pelanggan tercatat.
                </div>
              ) : (
                customers.map((c) => (
                  <div key={c.id} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-extrabold text-slate-900">{c.name || c.company_name}</h4>
                      <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                        ID: #{c.id}
                      </span>
                    </div>
                    {c.contact_person && (
                      <p className="text-[11px] text-slate-500">PIC: {c.contact_person}</p>
                    )}
                    {c.phone && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{c.phone}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setIsCustomerModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors shrink-0 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
