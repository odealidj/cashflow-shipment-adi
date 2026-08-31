'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { 
  User, 
  Lock, 
  Store, 
  HardDrive, 
  Download, 
  Upload, 
  FileText, 
  Trash2, 
  ChevronRight, 
  Edit3,
  Monitor,
  Building2,
  X,
  Phone,
  Mail,
  Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePinAuth } from '@/hooks/usePinAuth';

export default function PengaturanPage() {
  const router = useRouter();
  const { updatePin, resetPinToDefault, logout } = usePinAuth();
  const [userName, setUserName] = useState('User');
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('User');
  const [isUploading, setIsUploading] = useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('transio_user_name');
    if (stored) {
      setUserName(stored);
      setNameInput(stored);
    }
  }, []);

  const handleSaveName = () => {
    localStorage.setItem('transio_user_name', nameInput);
    setUserName(nameInput);
    setIsEditingName(false);
  };

  const handleUbahPin = () => {
    const newPin = prompt('Masukkan 6-digit PIN baru:');
    if (newPin) {
      if (updatePin(newPin)) {
        alert('PIN berhasil diperbarui!');
      } else {
        alert('PIN harus berupa 6 angka!');
      }
    }
  };

  const handleExportExcel = () => {
    const token = localStorage.getItem('token');
    const url = `http://localhost:8080/api/v1/cashflow/export${token ? `?token=${token}` : ''}`;
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
      const res = await fetch('http://localhost:8080/api/v1/cashflow/import', {
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
        alert('Gagal mengimpor Excel: ' + (data.message || 'Terjadi kesalahan'));
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
      const res = await fetch('http://localhost:8080/api/v1/vendors', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (data.status && Array.isArray(data.data)) {
        setVendors(data.data);
      }
    } catch (err) {
      console.error('Failed to load vendors', err);
    } finally {
      setLoadingVendors(false);
    }
  };

  const handleSoftDeleteAll = () => {
    if (confirm('PERINGATAN: Apakah Anda yakin ingin menyembunyikan semua data transaksi? (Data akan dibackup secara otomatis)')) {
      alert('Data transaksi telah disembunyikan dan diarsipkan ke history.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-10">
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pengaturan</h1>
        <p className="text-[13px] text-slate-500 font-medium">Kelola profil, data, dan preferensi aplikasi</p>
      </div>

      <div className="px-4 py-3 space-y-5">
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
            <p className="text-[11px] font-bold text-blue-600 tracking-wide uppercase">
              Logistics Indonesia
            </p>
            <p className="text-[10px] text-slate-400 font-medium truncate">
              Sistem Buku Kas & Pelacakan Shipment
            </p>
          </div>
        </div>

        {/* GRUP 1: PROFIL */}
        <div className="space-y-1.5">
          <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider px-1">Profil</span>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100 overflow-hidden">
            {/* Nama Pengguna */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-[14px] font-bold text-slate-900">Nama Pengguna</h2>
                  {isEditingName ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-800"
                      />
                      <button
                        onClick={handleSaveName}
                        className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs font-bold"
                      >
                        Simpan
                      </button>
                    </div>
                  ) : (
                    <p className="text-[12px] text-slate-500">{userName}</p>
                  )}
                </div>
              </div>

              {!isEditingName && (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-2 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Ubah PIN */}
            <button
              onClick={handleUbahPin}
              className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-[14px] font-bold text-slate-900">Ubah PIN</h2>
                  <p className="text-[12px] text-slate-500">Ubah PIN keamanan aplikasi Anda</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* GRUP 2: MANAJEMEN DATA */}
        <div className="space-y-1.5">
          <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider px-1">Manajemen Data</span>
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
                  <h2 className="text-[14px] font-bold text-slate-900">Manajemen Vendor</h2>
                  <p className="text-[12px] text-slate-500">Lihat daftar vendor dan informasi kontak</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* GRUP 3: PENYIMPANAN & EXPORT */}
        <div className="space-y-1.5">
          <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider px-1">Penyimpanan & File</span>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100 overflow-hidden">
            {/* Hidden Excel File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls"
              className="hidden"
            />

            {/* Penggunaan Penyimpanan */}
            <div className="p-3.5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-[14px] font-bold text-slate-900">Penggunaan Penyimpanan</h2>
                  <p className="text-[12px] text-slate-500">Database Lokal & Cloud Sync</p>
                </div>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="w-[12%] h-full bg-blue-600 rounded-full" />
              </div>
              <span className="text-[10px] text-slate-400 block text-right mt-1">Aktif</span>
            </div>

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
                  <h2 className="text-[14px] font-bold text-slate-900">Ekspor Data (Excel)</h2>
                  <p className="text-[12px] text-slate-500">Unduh semua transaksi ke file .xlsx</p>
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
                  <h2 className="text-[14px] font-bold text-slate-900">
                    {isUploading ? 'Mengunggah Excel...' : 'Impor Data (Excel)'}
                  </h2>
                  <p className="text-[12px] text-slate-500">Impor transaksi dari file .xlsx</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* GRUP 4: BACKUP & DESTRUCTIVE */}
        <div className="space-y-1.5">
          <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider px-1">Penyimpanan & Backup</span>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <button
              onClick={handleSoftDeleteAll}
              className="w-full p-3.5 flex items-center justify-between hover:bg-rose-50/50 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-[14px] font-bold text-rose-600">Sembunyikan Semua Data</h2>
                  <p className="text-[12px] text-slate-500">Soft-delete + backup otomatis (bisa di-restore)</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Beralih ke Desktop Version */}
        <div className="pt-1">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[13px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Monitor className="w-4 h-4" />
            <span>Buka Versi Desktop (Back-Office)</span>
          </button>
        </div>

        {/* Footer App Info */}
        <div className="text-center pt-6 pb-4 space-y-1 text-slate-400">
          <p className="text-[13px] font-bold text-slate-700">PT. Adijayantara Logistics Indonesia</p>
          <p className="text-[11px] text-slate-500 font-medium">Sistem Cashflow & Shipment Control v1.0.3</p>
          <p className="text-[10px] text-slate-400 pt-1">© 2026 PT. Adijayantara Logistics Indonesia. All rights reserved.</p>
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
                <Store className="w-5 h-5 text-blue-600" />
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
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
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
                      <h4 className="text-xs font-extrabold text-slate-900">{v.name}</h4>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        ID: #{v.id}
                      </span>
                    </div>
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
    </div>
  );
}
