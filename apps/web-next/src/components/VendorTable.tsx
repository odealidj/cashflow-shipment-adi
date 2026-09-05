"use client";

import { useEffect, useState } from "react";
import { 
  Truck, 
  Plus, 
  Mail, 
  Phone, 
  Calendar, 
  Edit, 
  Trash2, 
  Search, 
  RotateCcw, 
  AlertTriangle,
  Route,
  CheckCircle2,
  FileText
} from "lucide-react";
import { VendorModal } from "@/components/VendorModal";
import { fetchWithAuth } from "@/lib/apiClient";
import { tableTheadClass, ActionButton } from "@/components/shared/TableCard";
import { TablePagination } from "@/components/shared/TablePagination";
import { KpiCardGrid } from "@/components/shared/KpiCardGrid";
import { KpiCard } from "@/components/shared/KpiCard";

export interface Vendor {
  id?: number;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  created_at?: string;
}

export function VendorTable() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);

  // Reset to page 1 on search change
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  // Delete Confirmation State
  const [deleteCandidate, setDeleteCandidate] = useState<Vendor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm.trim())}` : "";
      const res = await fetchWithAuth(`http://localhost:8080/api/v1/vendors?page=${page}&limit=${pageSize}${searchParam}`);
      const data = await res.json();
      if (data.status && data.data) {
        setVendors(Array.isArray(data.data) ? data.data : (data.data.entries || []));
        setTotal(data.meta?.total_items ?? data.data?.total ?? 0);
      } else {
        setVendors([]);
        setTotal(0);
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
  }, [page, pageSize, searchTerm]);

  const formatDate = (dateString?: string) => {
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
    if (!deleteCandidate || !deleteCandidate.id) return;

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
        data = { message: text || `HTTP Error ${res.status}` };
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

  // Kalkulasi Ringkasan Cepat
  const totalPhoneCount = safeVendors.filter(v => Boolean(v.phone && v.phone.trim())).length;
  const totalEmailCount = safeVendors.filter(v => Boolean(v.email && v.email.trim())).length;
  const totalNotesCount = safeVendors.filter(v => Boolean(v.notes && v.notes.trim())).length;

  return (
    <>
      <div className="flex-1 flex flex-col space-y-4 min-h-0">
        {/* KPI Strip Ringkasan Vendor (Seragam dengan Customer) */}
        <div className="shrink-0">
          <KpiCardGrid cols={4}>
          <KpiCard
            title="Total Vendor"
            value={`${total || safeVendors.length} Vendor`}
            subtitle="Vendor armada aktif terdaftar"
            icon={<Truck className="w-5 h-5" />}
            variant="sky"
          />
          <KpiCard
            title="Kontak Telepon / WA"
            value={`${totalPhoneCount} Kontak`}
            subtitle="Dapat dihubungi untuk pemesanan"
            icon={<Phone className="w-5 h-5" />}
            variant="teal"
          />
          <KpiCard
            title="Email Korespondensi"
            value={`${totalEmailCount} Email`}
            subtitle="Invoice & PO armada"
            icon={<Mail className="w-5 h-5" />}
            variant="success"
          />
          <KpiCard
            title="Catatan Rute Armada"
            value={`${totalNotesCount} Terdata`}
            subtitle="Preferensi rute & jenis truk"
            icon={<Route className="w-5 h-5" />}
            variant="default"
          />
          </KpiCardGrid>
        </div>

        {/* Unified 1 Card Container: Header + Filter Toolbar + Table + Footer */}
        <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs flex-1 flex flex-col min-h-0">
          {/* Top Actions Bar */}
          <div className="shrink-0 px-6 py-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4 bg-slate-50/50">
            <div>
              <h1 className="text-xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
                <div className="w-8 h-8 rounded-xl bg-sky-100/80 text-sky-800 flex items-center justify-center shadow-2xs">
                  <Truck className="w-4 h-4" />
                </div>
                <span>Daftar Master Vendor</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Kelola data vendor, kontak telepon/WA, email, serta rute operasional armada
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleOpenCreate}
                className="text-xs bg-sky-700 hover:bg-sky-800 active:scale-95 text-white px-4 py-2 rounded-xl transition-all font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> Tambah Vendor
              </button>
            </div>
          </div>

          {/* Integrated Filter Sub-Header Toolbar */}
          <div className="shrink-0 p-4 pb-3.5 bg-slate-50/40 border-b border-slate-100 space-y-3 transition-all">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[260px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama vendor, nomor telepon/WA, email, rute armada..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-1.5 pl-9 pr-3 text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium placeholder:text-slate-400 shadow-2xs"
                />
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Pencarian</span>
                </button>
              )}
            </div>
          </div>
          
          {/* Vendor Table Data (7 Kolom Seragam dengan Customer) */}
          <div className="flex-1 overflow-auto soft-scrollbar scroll-smooth relative min-h-0">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead className={tableTheadClass}>
                <tr>
                  <th className="px-6 py-3.5 w-12 text-center">No</th>
                  <th className="px-6 py-3.5 min-w-[220px]">Nama Vendor</th>
                  <th className="px-6 py-3.5 min-w-[180px]">No. Telepon / WhatsApp</th>
                  <th className="px-6 py-3.5 min-w-[200px]">Email Korespondensi</th>
                  <th className="px-6 py-3.5 min-w-[240px]">Catatan / Rute Armada</th>
                  <th className="px-6 py-3.5 min-w-[150px]">Terdaftar Pada</th>
                  <th className="px-6 py-3.5 text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-700"></div>
                      <p className="mt-2 text-xs font-semibold">Memuat master data vendor...</p>
                    </td>
                  </tr>
                ) : filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      {searchTerm ? "Tidak ada vendor yang cocok dengan kata kunci pencarian." : "Belum ada vendor terdaftar."}
                    </td>
                  </tr>
                ) : (
                  filteredVendors.map((vendor: Vendor, idx: number) => (
                    <tr key={vendor.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 text-center font-mono text-slate-400 font-bold">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-sky-100/70 text-sky-800 flex items-center justify-center text-xs font-black shrink-0 shadow-xs border border-sky-200/50">
                            {vendor.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 text-xs sm:text-sm">{vendor.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">ID Vendor #{vendor.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {vendor.phone ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
                            <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{vendor.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Belum ada nomor</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {vendor.email ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="truncate max-w-[180px]">{vendor.email}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        {vendor.notes ? (
                          <div className="flex items-start gap-1.5 text-xs text-slate-600">
                            <FileText className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{vendor.notes}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">-</span>
                        )}
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

          {/* Footer Pagination Terpadu */}
          <TablePagination
            currentPage={page}
            totalItems={total}
            pageSize={pageSize}
            currentCount={vendors.length}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            itemUnit="vendor"
          />
        </div>
      </div>

      {/* Vendor Modal (Create / Edit) */}
      <VendorModal
        isOpen={isModalOpen}
        vendor={selectedVendor}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchVendors}
      />

      {/* Modal Konfirmasi Soft Delete (Seragam dengan Customer) */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 relative border border-slate-100 shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Hapus Data Vendor?</h3>
                <p className="text-xs text-slate-500">Tindakan ini akan mengarsipkan data vendor ini (Soft Delete)</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-6 bg-slate-50 p-3.5 rounded-xl border border-slate-100 leading-relaxed">
              Apakah Anda yakin ingin menghapus data vendor <strong className="text-slate-900">{deleteCandidate.name}</strong>? Riwayat transaksi lama yang terhubung dengan vendor ini akan tetap aman tersimpan.
            </p>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSoftDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
