"use client";

import { useEffect, useState } from "react";
import { 
  Sparkles, 
  Plus, 
  Search, 
  RotateCcw, 
  AlertTriangle,
  Truck,
  Route,
  Edit,
  Trash2,
  Calendar,
  Layers,
  CheckCircle2,
  FileText
} from "lucide-react";
import { ActivityPresetModal, ActivityPreset } from "@/components/ActivityPresetModal";
import { fetchWithAuth } from "@/lib/apiClient";
import { tableTheadClass, ActionButton } from "@/components/shared/TableCard";
import { TablePagination } from "@/components/shared/TablePagination";
import { KpiCardGrid } from "@/components/shared/KpiCardGrid";
import { KpiCard } from "@/components/shared/KpiCard";

interface ActivityPresetTableProps {
  category?: "ACT_INFO" | "ACT_EXPLAIN";
}

export function ActivityPresetTable({ category }: ActivityPresetTableProps) {
  const [presets, setPresets] = useState<ActivityPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "ACT_INFO" | "ACT_EXPLAIN">(category || "ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setPage(1);
  }, [activeTab, category, searchTerm]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<ActivityPreset | null>(null);

  // Delete Confirmation State
  const [deleteCandidate, setDeleteCandidate] = useState<ActivityPreset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const effectiveCategory = category || (activeTab === "ALL" ? "" : activeTab);
  const isDedicated = Boolean(category);
  const isArmada = category === "ACT_INFO";

  const fetchPresets = async () => {
    setLoading(true);
    try {
      const categoryParam = effectiveCategory ? `&category=${effectiveCategory}` : "";
      const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm.trim())}` : "";
      const res = await fetchWithAuth(`http://localhost:8080/api/v1/activity-presets?page=${page}&limit=${pageSize}${categoryParam}${searchParam}`);
      const data = await res.json();
      if (data.status && data.data) {
        setPresets(Array.isArray(data.data) ? data.data : (data.data.entries || []));
        setTotal(data.meta?.total_items ?? data.data?.total ?? 0);
      } else {
        setPresets([]);
        setTotal(0);
      }
    } catch (err) {
      console.error("Failed to fetch presets", err);
      setPresets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresets();
  }, [page, pageSize, activeTab, category, searchTerm]);

  const handleOpenCreate = () => {
    setSelectedPreset(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (preset: ActivityPreset) => {
    setSelectedPreset(preset);
    setIsModalOpen(true);
  };

  const handleConfirmSoftDelete = async () => {
    if (!deleteCandidate || !deleteCandidate.id) return;

    setIsDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8080/api/v1/activity-presets/${deleteCandidate.id}`, {
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
        throw new Error(data.message || "Gagal menghapus preset");
      }

      setDeleteCandidate(null);
      fetchPresets();
    } catch (err: any) {
      alert(err.message || "Gagal melakukan soft delete preset");
    } finally {
      setIsDeleting(false);
    }
  };

  const safePresets = Array.isArray(presets) ? presets : [];
  const currentTotal = total || safePresets.length;

  return (
    <>
      <div className="flex-1 flex flex-col space-y-4 min-h-0">
        {/* KPI Strip Ringkasan Master */}
        <div className="shrink-0">
          <KpiCardGrid cols={4}>
          <KpiCard
            title={isDedicated ? (isArmada ? "Total Jenis Armada" : "Total Rute Delivery") : "Total Master Pilihan"}
            value={`${currentTotal} ${isDedicated ? (isArmada ? "Armada" : "Rute") : "Pilihan"}`}
            subtitle={isDedicated ? (isArmada ? "Preset jenis kendaraan operasional" : "Preset tujuan pengiriman muatan") : "Standarisasi penulisan transaksi"}
            icon={isDedicated ? (isArmada ? <Truck className="w-5 h-5" /> : <Route className="w-5 h-5" />) : <Sparkles className="w-5 h-5" />}
            variant={isDedicated ? (isArmada ? "sky" : "success") : "sky"}
          />
          <KpiCard
            title="Kelompok Master"
            value={isDedicated ? (isArmada ? "Keterangan Aktivitas" : "Catatan Tambahan") : "Kombinasi 2 Kategori"}
            subtitle={isDedicated ? (isArmada ? "Kode: ACT_INFO" : "Kode: ACT_EXPLAIN") : "ACT_INFO & ACT_EXPLAIN"}
            icon={<Layers className="w-5 h-5" />}
            variant="teal"
          />
          <KpiCard
            title="Integrasi Transaksi"
            value="100% Aktif"
            subtitle="Tersedia di form Shipment & Mobile"
            icon={<CheckCircle2 className="w-5 h-5" />}
            variant="success"
          />
          <KpiCard
            title="Metode Input"
            value="Autocomplete"
            subtitle="Pilihan resmi + bisa ketik bebas"
            icon={<Sparkles className="w-5 h-5" />}
            variant="default"
          />
          </KpiCardGrid>
        </div>

        {/* Unified 1 Card Container */}
        <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs flex-1 flex flex-col min-h-0">
          {/* Top Actions Bar */}
          <div className="shrink-0 px-6 py-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4 bg-slate-50/50">
            <div>
              <h1 className="text-xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-2xs ${
                  isDedicated 
                    ? (isArmada ? "bg-sky-100/80 text-sky-800" : "bg-emerald-100/80 text-emerald-800")
                    : "bg-sky-100/80 text-sky-800"
                }`}>
                  {isDedicated ? (isArmada ? <Truck className="w-4 h-4" /> : <Route className="w-4 h-4" />) : <Sparkles className="w-4 h-4" />}
                </div>
                <span>
                  {isDedicated 
                    ? (isArmada ? "Daftar Master Keterangan Aktivitas & Armada" : "Daftar Master Catatan & Rute Pengiriman")
                    : "Master Keterangan Aktivitas & Rute"}
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isDedicated 
                  ? (isArmada 
                      ? "Kelola pilihan standar jenis armada (Tronton, Fuso, Trailer, CDD, dll) agar data pencatatan shipment seragam" 
                      : "Kelola pilihan standar rute delivery antar kota & catatan kargo agar penulisan transaksi selalu konsisten")
                  : "Kelola daftar pilihan preset armada dan rute delivery"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleOpenCreate}
                className={`text-xs text-white px-4 py-2 rounded-xl transition-all font-bold shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                  isDedicated && !isArmada
                    ? "bg-emerald-700 hover:bg-emerald-800"
                    : "bg-sky-700 hover:bg-sky-800"
                }`}
              >
                <Plus className="w-4 h-4 stroke-[3]" /> 
                <span>{isDedicated ? (isArmada ? "Tambah Keterangan Armada" : "Tambah Rute Pengiriman") : "Tambah Pilihan Master"}</span>
              </button>
            </div>
          </div>

          {/* Integrated Filter Sub-Header Toolbar */}
          <div className="shrink-0 p-4 pb-3.5 bg-slate-50/40 border-b border-slate-100 space-y-3 transition-all">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Category Tabs (Only show if not dedicated single category) */}
              {!isDedicated ? (
                <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-xl">
                  {[
                    { id: "ALL", label: "Semua Kategori" },
                    { id: "ACT_INFO", label: "🚛 Keterangan Armada" },
                    { id: "ACT_EXPLAIN", label: "📍 Rute & Delivery" },
                  ].map(tab => {
                    const active = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id as any);
                          setPage(1);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          active
                            ? "bg-white text-sky-900 shadow-2xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border ${
                    isArmada
                      ? "bg-sky-50 text-sky-800 border-sky-200"
                      : "bg-emerald-50 text-emerald-800 border-emerald-200"
                  }`}>
                    {isArmada ? <Truck className="w-3.5 h-3.5" /> : <Route className="w-3.5 h-3.5" />}
                    <span>{isArmada ? "Kategori: Keterangan Aktivitas (ACT_INFO)" : "Kategori: Catatan Tambahan (ACT_EXPLAIN)"}</span>
                  </span>
                </div>
              )}

              {/* Search Bar */}
              <div className="flex items-center gap-2 flex-1 max-w-xs ml-auto">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={isDedicated ? (isArmada ? "Cari nama armada..." : "Cari nama rute delivery...") : "Cari opsi / nama rute..."}
                    value={searchTerm}
                    onChange={e => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl py-1.5 pl-9 pr-3 text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium placeholder:text-slate-400 shadow-2xs"
                  />
                </div>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Table Data */}
          <div className="flex-1 overflow-auto soft-scrollbar scroll-smooth relative min-h-0">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead className={tableTheadClass}>
                <tr>
                  <th className="px-6 py-3.5 w-12 text-center">No</th>
                  {!isDedicated && <th className="px-6 py-3.5 min-w-[160px]">Kategori</th>}
                  <th className="px-6 py-3.5 min-w-[240px]">
                    {isDedicated ? (isArmada ? "Nama Keterangan / Armada" : "Nama Rute / Catatan Delivery") : "Nama Opsi Preset"}
                  </th>
                  <th className="px-6 py-3.5 min-w-[280px]">
                    {isDedicated ? (isArmada ? "Deskripsi / Rincian Kapasitas" : "Deskripsi / Rincian Rute") : "Deskripsi / Penjelasan"}
                  </th>
                  <th className="px-6 py-3.5 text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={isDedicated ? 4 : 5} className="px-6 py-12 text-center text-slate-400">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-700"></div>
                      <p className="mt-2 text-xs font-semibold">Memuat data master...</p>
                    </td>
                  </tr>
                ) : safePresets.length === 0 ? (
                  <tr>
                    <td colSpan={isDedicated ? 4 : 5} className="px-6 py-12 text-center text-slate-400">
                      {searchTerm ? "Tidak ada opsi yang cocok dengan pencarian." : "Belum ada data master terdaftar."}
                    </td>
                  </tr>
                ) : (
                  safePresets.map((preset: ActivityPreset, idx: number) => {
                    const isRowArmada = preset.category === "ACT_INFO";

                    return (
                      <tr key={preset.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-4 text-center font-mono text-slate-400 font-bold">
                          {idx + 1}
                        </td>
                        {!isDedicated && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold border ${
                              isRowArmada
                                ? "bg-sky-50 text-sky-800 border-sky-200"
                                : "bg-emerald-50 text-emerald-800 border-emerald-200"
                            }`}>
                              {isRowArmada ? <Truck className="w-3.5 h-3.5" /> : <Route className="w-3.5 h-3.5" />}
                              <span>{isRowArmada ? "Keterangan Aktivitas" : "Catatan Tambahan"}</span>
                            </span>
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <div className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                              isRowArmada ? "bg-sky-100 text-sky-800" : "bg-emerald-100 text-emerald-800"
                            }`}>
                              {isRowArmada ? "🚛" : "📍"}
                            </div>
                            <span>{preset.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 ml-9">ID #{preset.id}</div>
                        </td>
                        <td className="px-6 py-4 max-w-xs text-slate-600">
                          {preset.description ? (
                            <span>{preset.description}</span>
                          ) : (
                            <span className="text-slate-400 italic text-xs">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <ActionButton
                              onClick={() => handleOpenEdit(preset)}
                              icon={<Edit className="w-3.5 h-3.5" />}
                              title="Edit Master Opsi"
                              variant="amber"
                            />
                            <ActionButton
                              onClick={() => setDeleteCandidate(preset)}
                              icon={<Trash2 className="w-3.5 h-3.5" />}
                              title="Hapus Opsi (Soft Delete)"
                              variant="rose"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Pagination Terpadu */}
          <TablePagination
            currentPage={page}
            totalItems={total || currentTotal}
            pageSize={pageSize}
            currentCount={safePresets.length}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            itemUnit={isArmada ? "aktivitas/armada" : "catatan/rute"}
            infoSuffix={effectiveCategory ? `Kategori: ${effectiveCategory}` : "Semua Kategori"}
          />
        </div>
      </div>

      {/* Preset Modal (Create / Edit) */}
      <ActivityPresetModal
        isOpen={isModalOpen}
        preset={selectedPreset}
        defaultCategory={category || (activeTab === "ACT_EXPLAIN" ? "ACT_EXPLAIN" : "ACT_INFO")}
        lockCategory={isDedicated}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchPresets}
      />

      {/* Modal Konfirmasi Soft Delete */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 relative border border-slate-100 shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Hapus Opsi Master?</h3>
                <p className="text-xs text-slate-500">Tindakan ini akan menonaktifkan opsi dari daftar saran (Soft Delete)</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-6 bg-slate-50 p-3.5 rounded-xl border border-slate-100 leading-relaxed">
              Apakah Anda yakin ingin menghapus opsi <strong className="text-slate-900">{deleteCandidate.name}</strong>? Riwayat transaksi lama yang pernah menggunakan opsi ini tidak akan terpengaruh.
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
                {isDeleting ? "Menghapus..." : "Ya, Hapus Opsi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
