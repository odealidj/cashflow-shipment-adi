"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowRight, 
  Wallet, 
  Activity, 
  Download, 
  Upload, 
  ArrowUp, 
  ArrowDown,
  Edit2, 
  Trash2, 
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus
} from "lucide-react";

import { TopUpModal } from "./TopUpModal";
import { ShipmentModal } from "./ShipmentModal";
import { EditEntryModal } from "./EditEntryModal";
import { EntryDetailModal } from "./EntryDetailModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { FilterBar, FilterState, getCurrentMonthRange } from "./FilterBar";

interface CashflowTableProps {
  onDataChange?: () => void;
}

export function CashflowTable({ onDataChange }: CashflowTableProps) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("ASC"); // Default ASC (urut dari awal bulan/tanggal terlama)

  // Default Filter: Bulan Ini (Range 1 s/d Akhir Bulan Ini)
  const [filters, setFilters] = useState<FilterState>(() => {
    const currentMonth = getCurrentMonthRange();
    return {
      date_from: currentMonth.date_from,
      date_to: currentMonth.date_to,
      entry_type: "",
      remarks: "",
      vendor_name: ""
    };
  });

  // Modal States
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isShipmentOpen, setIsShipmentOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<any>(null);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "15");
    params.set("sort", sortDir);

    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    if (filters.entry_type) params.set("entry_type", filters.entry_type);
    if (filters.remarks) params.set("remarks", filters.remarks);
    if (filters.vendor_name) params.set("vendor_name", filters.vendor_name);

    return params.toString();
  }, [page, sortDir, filters]);

  const fetchCashflow = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const query = buildQueryString();
      const res = await fetch(`http://localhost:8080/api/v1/cashflow?${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status && data.data) {
        setEntries(data.data.entries || data.data || []);
        setTotal(data.data.total || (data.data.entries ? data.data.entries.length : 0));
      } else {
        setEntries([]);
      }
    } catch (err) {
      console.error("Failed to fetch cashflow", err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [buildQueryString]);

  const [summary, setSummary] = useState<any>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8080/api/v1/cashflow/summary", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status && data.data) {
        setSummary(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch summary", err);
    }
  }, []);

  useEffect(() => {
    fetchCashflow();
    fetchSummary();
  }, [fetchCashflow, fetchSummary]);

  const handleDataRefresh = () => {
    fetchCashflow();
    fetchSummary();
    if (onDataChange) onDataChange();
  };

  const toggleSort = () => {
    setSortDir(s => s === "ASC" ? "DESC" : "ASC");
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem("token");
      const query = buildQueryString();
      const res = await fetch(`http://localhost:8080/api/v1/cashflow/export?${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to export");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Cashflow_Export_${sortDir}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8080/api/v1/cashflow/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.status) {
        alert("Excel berhasil diimpor!");
        fetchCashflow();
        fetchSummary();
        if (onDataChange) onDataChange();
      } else {
        alert(`Gagal impor: ${data.message}`);
      }
    } catch (err) {
      console.error("Import error", err);
      alert("Terjadi kesalahan saat mengunggah file");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteConfirm = async (entry: any) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8080/api/v1/cashflow/${entry.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Gagal menghapus transaksi");
      fetchCashflow();
      fetchSummary();
      if (onDataChange) onDataChange();
    } catch (err) {
      console.error("Delete failed", err);
      alert("Gagal menghapus transaksi dari database.");
    }
  };

  const handleOpenDelete = (entry: any) => {
    setEntryToDelete(entry);
    setIsDeleteOpen(true);
  };

  const handleStatusChange = async (entryId: any, nextStatus: string) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`http://localhost:8080/api/v1/cashflow/${entryId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ remarks: nextStatus })
      });
      fetchCashflow();
      fetchSummary();
      if (onDataChange) onDataChange();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit", month: "short", year: "numeric"
    });
  };

  const renderRemarksBadge = (entry: any) => {
    const status = entry.remarks;
    if (entry.entry_type === "TOP_UP" || status === "PAID") {
      return (
        <button
          onClick={() => handleStatusChange(entry.id, "UNPAID")}
          title="Klik untuk ubah ke Belum Lunas"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
        >
          <CheckCircle2 className="w-3 h-3" /> Lunas
        </button>
      );
    } else if (status === "PENDING") {
      return (
        <button
          onClick={() => handleStatusChange(entry.id, "PAID")}
          title="Klik untuk tandai Lunas"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 transition-colors cursor-pointer shadow-2xs"
        >
          <Clock className="w-3 h-3" /> Sebagian
        </button>
      );
    } else {
      return (
        <button
          onClick={() => handleStatusChange(entry.id, "PAID")}
          title="Klik untuk tandai Lunas"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer shadow-2xs"
        >
          <AlertCircle className="w-3 h-3" /> Belum Lunas
        </button>
      );
    }
  };

  const safeEntries = Array.isArray(entries) ? entries : [];

  return (
    <>
      <div className="space-y-4">
        {/* MINI SUMMARY STRIP (KPI SNAPSHOT REAL-TIME) */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Saldo Kas */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <span>Saldo Kas</span>
                <Wallet className="w-4 h-4 text-sky-700" />
              </div>
              <div className="mt-1.5 font-mono text-lg font-black text-sky-950">
                {formatCurrency(summary.current_saldo)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Posisi kas operasional</div>
            </div>

            {/* Total Pengeluaran (Debit) */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <span>Total Pengeluaran</span>
                <ArrowDownRight className="w-4 h-4 text-rose-600" />
              </div>
              <div className="mt-1.5 font-mono text-lg font-black text-rose-600">
                {formatCurrency(summary.total_debit)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Akumulasi kas keluar</div>
            </div>

            {/* Total Modal Masuk (Kredit) */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <span>Total Modal Masuk</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-1.5 font-mono text-lg font-black text-emerald-700">
                {formatCurrency(summary.total_kredit)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Top-up & kas masuk</div>
            </div>

            {/* Tagihan Belum Lunas */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <span>Belum Dibayar</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-1.5 font-mono text-lg font-black text-amber-700 flex items-baseline gap-1.5">
                <span>{summary.unpaid_count}</span>
                <span className="text-xs font-bold text-slate-400 font-sans">
                  ({formatCurrency(summary.unpaid_amount)})
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Kewajiban vendor pending</div>
            </div>
          </div>
        )}

        {/* LAYER 1: TOP HEADER & ACTION BUTTONS (CLEAN HEADER TANPA KOTAK CARD) */}
        <div className="flex flex-wrap justify-between items-center gap-4 py-1">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
              <div className="w-8 h-8 rounded-xl bg-sky-100/80 text-sky-800 flex items-center justify-center shadow-2xs">
                <Activity className="w-4 h-4" />
              </div>
              <span>Transaksi Cashflow & Shipment</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Monitoring arus kas, biaya shipment, jatuh tempo, serta histori operasional
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              hidden 
              ref={fileInputRef} 
              onChange={handleImport} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="text-xs bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl transition-colors font-bold border border-slate-200 flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-sky-700" /> Impor Excel
            </button>
            <button 
              onClick={handleExport}
              className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3.5 py-2 rounded-xl transition-colors font-bold border border-emerald-200 flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" /> Ekspor Excel
            </button>
            <button 
              onClick={() => setIsTopUpOpen(true)}
              className="text-xs bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl transition-colors font-bold border border-slate-200 flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5 text-slate-600" /> Tambah Modal
            </button>
            <button 
              onClick={() => setIsShipmentOpen(true)}
              className="text-xs bg-sky-700 hover:bg-sky-800 text-white px-4 py-2 rounded-xl transition-all font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Catat Shipment
            </button>
          </div>
        </div>

        {/* LAYER 2: FILTER TOOLBAR (CARD MANDIRI) */}
        <FilterBar
          filters={filters}
          sortDir={sortDir}
          onToggleSort={toggleSort}
          onFilterChange={(f) => {
            setFilters(f);
            setPage(1);
          }}
          onReset={() => {
            const currentMonth = getCurrentMonthRange();
            setFilters({
              date_from: currentMonth.date_from,
              date_to: currentMonth.date_to,
              entry_type: "",
              remarks: "",
              vendor_name: ""
            });
            setSortDir("ASC");
            setPage(1);
          }}
        />

        {/* LAYER 3: DATA TABLE CONTAINER (CARD MANDIRI) */}
        <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead className="text-[11px] uppercase bg-[#EBF3FA] text-[#223249] border-b border-sky-200/70 tracking-wider">
                <tr>
                  <th 
                    onClick={toggleSort}
                    className="px-4 py-3.5 font-black cursor-pointer hover:text-sky-700 transition-colors group select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Tanggal & Seq</span>
                      {sortDir === "ASC" ? (
                        <ArrowUp className="w-3.5 h-3.5 text-sky-600" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-sky-600" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3.5 font-black min-w-[220px]">Vendor & Aktivitas</th>
                  <th className="px-3 py-3.5 font-black text-right min-w-[150px]">Penjualan & Biaya</th>
                  <th className="px-3 py-3.5 font-black text-right min-w-[130px]">Profit & Margin</th>
                  <th className="px-3 py-3.5 font-black text-center min-w-[110px]">T.O.P / Due</th>
                  <th className="px-4 py-3.5 font-black text-right min-w-[140px]">Arus Kas</th>
                  <th className="px-4 py-3.5 font-black text-right min-w-[140px] bg-sky-100/50">
                    <span className="inline-flex items-center gap-1 bg-sky-900 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-2xs tracking-wider border border-sky-800">
                      ★ ROLLING SALDO
                    </span>
                  </th>
                  <th className="px-3 py-3.5 font-black text-center">Status</th>
                  <th className="px-4 py-3.5 font-black text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-700"></div>
                      <p className="mt-2 text-xs font-semibold">Memuat transaksi...</p>
                    </td>
                  </tr>
                ) : safeEntries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                      Tidak ada transaksi yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  safeEntries.map((entry: any) => {
                    const isShipment = entry.entry_type === "SHIPMENT";
                    return (
                      <tr 
                        key={entry.id} 
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest("button")) return;
                          setSelectedEntry(entry);
                          setIsDetailOpen(true);
                        }}
                      >
                        {/* 1. Tanggal & Sequence */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-400 font-bold text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                              #{entry.sequence_no}
                            </span>
                            <span className="font-bold text-slate-800 text-xs">
                              {formatDate(entry.date_of_entry)}
                            </span>
                          </div>
                        </td>

                        {/* 2. Vendor & Aktivitas */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                              !isShipment 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                : "bg-sky-50 text-sky-800 border border-sky-200"
                            }`}>
                              {!isShipment ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                              {entry.entry_type}
                            </span>
                            <span className="font-black text-slate-900 text-xs truncate max-w-[180px]">
                              {entry.vendor_name_raw || (!isShipment ? "KAS MODAL" : "-")}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1 truncate max-w-xs font-medium">
                            <span>{entry.act_information}</span>
                            {entry.act_explaination && (
                              <span className="text-slate-400 ml-1">({entry.act_explaination})</span>
                            )}
                          </div>
                        </td>

                        {/* 3. Penjualan & Biaya (Grand Selling vs Grand Cost) */}
                        <td className="px-3 py-3.5 text-right font-mono whitespace-nowrap">
                          {isShipment ? (
                            <div>
                              <div className="text-slate-900 font-bold text-xs">
                                {formatCurrency(entry.grand_selling)}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                                HPP: {formatCurrency(entry.grand_cost)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-300 font-bold">-</span>
                          )}
                        </td>

                        {/* 4. Profit & Margin */}
                        <td className="px-3 py-3.5 text-right font-mono whitespace-nowrap">
                          {isShipment ? (
                            <div>
                              <span className="text-emerald-700 font-black text-xs block">
                                + {formatCurrency(entry.profit)}
                              </span>
                              <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 text-[10px] font-bold border border-sky-100">
                                {(entry.margin_pct * 100).toFixed(1)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300 font-bold">-</span>
                          )}
                        </td>

                        {/* 5. T.O.P & Jatuh Tempo */}
                        <td className="px-3 py-3.5 text-center whitespace-nowrap">
                          {isShipment ? (
                            <div>
                              <span className="text-slate-800 text-xs font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                                {entry.top_days ? `${entry.top_days} hari` : "-"}
                              </span>
                              {entry.due_date && (
                                <span className="text-[10px] text-amber-700 font-bold block mt-1">
                                  {formatDate(entry.due_date)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 font-bold">-</span>
                          )}
                        </td>

                        {/* 6. Arus Kas (Debit vs Kredit) */}
                        <td className="px-4 py-3.5 text-right font-mono whitespace-nowrap">
                          {entry.debit > 0 ? (
                            <div>
                              <span className="text-rose-600 font-black text-xs">
                                − {formatCurrency(entry.debit)}
                              </span>
                              <span className="text-[9px] text-slate-400 block font-sans uppercase">Kas Keluar</span>
                            </div>
                          ) : entry.kredit > 0 ? (
                            <div>
                              <span className="text-emerald-700 font-black text-xs">
                                + {formatCurrency(entry.kredit)}
                              </span>
                              <span className="text-[9px] text-slate-400 block font-sans uppercase">Kas Masuk</span>
                            </div>
                          ) : (
                            <span className="text-slate-300 font-bold">-</span>
                          )}
                        </td>

                        {/* 7. Rolling Saldo */}
                        <td className="px-4 py-3.5 text-right font-mono whitespace-nowrap bg-sky-50/30">
                          <span className="inline-block font-black text-sky-950 text-xs px-2.5 py-1 bg-white rounded-lg border border-sky-200/80 shadow-2xs">
                            {formatCurrency(entry.saldo)}
                          </span>
                        </td>

                        {/* 8. Status Pembayaran */}
                        <td className="px-3 py-3.5 text-center whitespace-nowrap">
                          {renderRemarksBadge(entry)}
                        </td>

                        {/* 9. Tombol Aksi */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setSelectedEntry(entry);
                                setIsDetailOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-sky-700 hover:bg-sky-50 transition-colors cursor-pointer"
                              title="Lihat Detail"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedEntry(entry);
                                setIsEditOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-sky-700 hover:bg-sky-50 transition-colors cursor-pointer"
                              title="Edit Transaksi"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDelete(entry)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Hapus Transaksi"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          <div className="px-6 py-3.5 border-t border-slate-100 flex flex-wrap justify-between items-center gap-3 bg-slate-50/50">
            <span className="text-xs text-slate-500 font-medium">
              Menampilkan <span className="font-bold text-slate-900">{safeEntries.length}</span> dari <span className="font-bold text-slate-900">{total}</span> transaksi (Urut {sortDir})
            </span>
            <div className="flex items-center gap-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors text-xs font-bold shadow-2xs cursor-pointer"
              >
                Sebelumnya
              </button>
              <span className="px-2 py-1 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg">Hal {page}</span>
              <button 
                disabled={safeEntries.length < 15}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors text-xs font-bold shadow-2xs cursor-pointer"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      </div>

      <TopUpModal 
        isOpen={isTopUpOpen} 
        onClose={() => setIsTopUpOpen(false)} 
        onSuccess={handleDataRefresh} 
      />
      
      <ShipmentModal 
        isOpen={isShipmentOpen} 
        onClose={() => setIsShipmentOpen(false)} 
        onSuccess={handleDataRefresh} 
      />

      <EditEntryModal
        isOpen={isEditOpen}
        entry={selectedEntry}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedEntry(null);
        }}
        onSuccess={handleDataRefresh}
      />

      <EntryDetailModal
        isOpen={isDetailOpen}
        entry={selectedEntry}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedEntry(null);
        }}
        onEdit={(entry) => {
          setSelectedEntry(entry);
          setIsEditOpen(true);
        }}
        onStatusChange={handleStatusChange}
      />

      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        entry={entryToDelete}
        onClose={() => {
          setIsDeleteOpen(false);
          setEntryToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
