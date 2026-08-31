"use client";

import { useEffect, useState } from "react";
import { Truck, Plus, Mail, Phone, Calendar, Edit, Trash2, Search, RotateCcw, AlertTriangle } from "lucide-react";
import { VendorModal } from "@/components/VendorModal";
import { fetchWithAuth } from "@/lib/apiClient";
import { tableTheadClass, ActionButton } from "@/components/shared/TableCard";

interface Vendor {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  created_at: string;
}

export function VendorTable() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  // Delete Confirmation State
  const [deleteCandidate, setDeleteCandidate] = useState<Vendor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`http://localhost:8080/api/v1/vendors?page=${page}&limit=50`);
      const data = await res.json();
      if (data.status && data.data) {
        setVendors(data.data.entries || data.data || []);
        setTotal(data.data.total || 0);
      } else {
        setVendors([]);
      }
    } catch (err) {
      console.error("Failed to fetch vendors", err);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [page]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit", month: "short", year: "numeric"
    });
  };

  const handleOpenCreate = () => {
    setSelectedVendor(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsModalOpen(true);
  };

  const handleConfirmSoftDelete = async () => {
    if (!deleteCandidate) return;

    setIsDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8080/api/v1/vendors/${deleteCandidate.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: text || `HTTP Error ${res.status} (Silakan restart backend service)` };
      }

      if (!res.ok) {
        throw new Error(data.message || "Gagal menghapus vendor");
      }

      setDeleteCandidate(null);
      fetchVendors();
    } catch (err: any) {
      alert(err.message || "Gagal melakukan soft delete vendor");
    } finally {
      setIsDeleting(false);
    }
  };

  const safeVendors = Array.isArray(vendors) ? vendors : [];
  const filteredVendors = safeVendors.filter(v => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    const nameMatch = (v.name || "").toLowerCase().includes(term);
    const phoneMatch = (v.phone || "").toLowerCase().includes(term);
    const emailMatch = (v.email || "").toLowerCase().includes(term);
    const notesMatch = (v.notes || "").toLowerCase().includes(term);
    return nameMatch || phoneMatch || emailMatch || notesMatch;
  });

  return (
    <>
      <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs">
        {/* Top Actions Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4 bg-slate-50/50">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
              <Truck className="w-5 h-5 text-blue-600" />
              <span>Daftar Master Vendor & Transporter</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Kelola data mitra armada, kontak, nomor telepon, serta pencatatan rute
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleOpenCreate}
              className="text-xs bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-4 py-2 rounded-xl transition-all font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Tambah Vendor
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 pb-0">
          <div className="mb-3 bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama vendor, nomor telepon, email, rute armada..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium placeholder:text-slate-400"
              />
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Vendor Table Data */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className={tableTheadClass}>
              <tr>
                <th className="px-6 py-3.5">Nama Vendor</th>
                <th className="px-6 py-3.5">Kontak & Telepon</th>
                <th className="px-6 py-3.5">Catatan / Rute</th>
                <th className="px-6 py-3.5">Terdaftar Pada</th>
                <th className="px-6 py-3.5 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </td>
                </tr>
              ) : filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    {searchTerm ? "Tidak ada vendor yang cocok dengan pencarian." : "Belum ada vendor terdaftar."}
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor: Vendor) => (
                  <tr key={vendor.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
                          {vendor.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm">{vendor.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">ID #{vendor.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {vendor.phone ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{vendor.phone}</span>
                          </div>
                        ) : null}
                        {vendor.email ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Mail className="w-3.5 h-3.5 text-blue-500" />
                            <span>{vendor.email}</span>
                          </div>
                        ) : null}
                        {!vendor.phone && !vendor.email && (
                          <span className="text-slate-400 italic text-xs">Tidak ada info kontak</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <span className="text-slate-600 line-clamp-2">{vendor.notes || "-"}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(vendor.created_at)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <ActionButton
                          onClick={() => handleOpenEdit(vendor)}
                          icon={<Edit className="w-3.5 h-3.5" />}
                          title="Edit Data Vendor"
                          variant="amber"
                        />
                        <ActionButton
                          onClick={() => setDeleteCandidate(vendor)}
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          title="Hapus Vendor (Soft Delete)"
                          variant="rose"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination & Summary */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex flex-wrap justify-between items-center gap-3 bg-slate-50/50">
          <span className="text-xs text-slate-500 font-medium">
            Menampilkan <span className="font-bold text-slate-900">{filteredVendors.length}</span> dari <span className="font-bold text-slate-900">{total}</span> vendor
          </span>
          <div className="flex gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors text-xs font-bold shadow-xs cursor-pointer"
            >
              Sebelumnya
            </button>
            <button 
              disabled={filteredVendors.length < 50}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors text-xs font-bold shadow-xs cursor-pointer"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* Create / Edit Vendor Modal */}
      <VendorModal
        isOpen={isModalOpen}
        vendor={selectedVendor}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchVendors}
      />

      {/* Soft Delete Confirmation Dialog Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 relative shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Hapus Vendor?</h3>
                <p className="text-xs text-slate-500">Konfirmasi soft delete mitra</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Apakah Anda yakin ingin menghapus vendor <strong>&ldquo;{deleteCandidate.name}&rdquo;</strong>? Data vendor akan dinonaktifkan (*soft delete*) dan tidak akan muncul di daftar pilihan baru, namun riwayat transaksi lama tetap aman tersimpan.
            </p>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmSoftDelete}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs text-white bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus Vendor"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
