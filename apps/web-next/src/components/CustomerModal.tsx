"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Building2, User, Phone, Mail, MapPin, FileText, CheckCircle2 } from "lucide-react";

export interface Customer {
  id?: number;
  name: string;
  pic_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  created_at?: string;
}

interface CustomerModalProps {
  isOpen: boolean;
  customer: Customer | null; // If null, Create mode. If provided, Edit mode.
  onClose: () => void;
  onSuccess: () => void;
}

export function CustomerModal({ isOpen, customer, onClose, onSuccess }: CustomerModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    pic_name: "",
    phone: "",
    email: "",
    address: "",
    notes: ""
  });

  const isEdit = Boolean(customer && customer.id);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || "",
        pic_name: customer.pic_name || "",
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",
        notes: customer.notes || ""
      });
    } else {
      setFormData({
        name: "",
        pic_name: "",
        phone: "",
        email: "",
        address: "",
        notes: ""
      });
    }
    setError("");
  }, [customer, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Nama customer / perusahaan wajib diisi");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const url = isEdit
        ? `http://localhost:8080/api/v1/customers/${customer?.id}`
        : "http://localhost:8080/api/v1/customers";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          pic_name: formData.pic_name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          address: formData.address.trim(),
          notes: formData.notes.trim()
        })
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: text || `HTTP Error ${res.status} (Silakan periksa koneksi backend)` };
      }

      if (!res.ok) {
        throw new Error(data.message || (isEdit ? "Gagal memperbarui customer" : "Gagal menambahkan customer"));
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat menyimpan data customer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl p-6 relative my-auto border border-slate-100 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${
            isEdit ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-sky-50 text-sky-700 border border-sky-100"
          }`}>
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isEdit ? `Edit Data Customer #${customer?.id}` : "Tambah Customer Baru"}
            </h2>
            <p className="text-xs text-slate-500">
              {isEdit ? "Perbarui informasi kontak, alamat, dan PIC perusahaan klien" : "Daftarkan perusahaan klien pemilik muatan ke master data"}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Nama Customer / Perusahaan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nama Perusahaan / Customer <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="Mis. PT Surya Mandiri Abadi"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Nama PIC Kontak Utama */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nama PIC (Person in Charge / Kontak Utama)
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Mis. Bpk. Hendra Wijaya (Logistik)"
                value={formData.pic_name}
                onChange={e => setFormData({ ...formData, pic_name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Telepon & Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">No. Telepon / WhatsApp</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="0812-3456-7890"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Email Billing / PIC</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="finance@perusahaan.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Alamat Perusahaan / Pabrik */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Kantor / Gudang / Pengiriman</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <textarea
                rows={2}
                placeholder="Kawasan Industri, Nama Gedung, Jalan, Kota..."
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Catatan Khusus */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Khusus / Terms Penagihan</label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <textarea
                rows={2}
                placeholder="Rutin muatan mingguan, syarat tukar faktur, jadwal operasional loading..."
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none resize-none"
              />
            </div>
          </div>

          <div className="pt-2 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs text-white shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                isEdit ? "bg-amber-600 hover:bg-amber-700 active:scale-95" : "bg-sky-600 hover:bg-sky-500 active:scale-95"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEdit ? "Perbarui Customer" : "Simpan Customer"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
