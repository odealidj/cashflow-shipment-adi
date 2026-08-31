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
import { FilterBar, FilterState } from "./FilterBar";

interface CashflowTableProps {
  onDataChange?: () => void;
}

export function CashflowTable({ onDataChange }: CashflowTableProps) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("ASC"); // Default ASC

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    date_from: "",
    date_to: "",
    entry_type: "",
    remarks: "",
    vendor_name: ""
  });

  // Modal States
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isShipmentOpen, setIsShipmentOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
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

  useEffect(() => {
    fetchCashflow();
  }, [fetchCashflow]);

  const handleDataRefresh = () => {
    fetchCashflow();
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
        if (onDataChange) onDataChange();
      } else {
        alert("Import gagal: " + data.message);
      }
    } catch (err) {
      console.error("Import failed", err);
      alert("Gagal mengimpor file Excel");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (entry: any) => {
    const confirmed = window.confirm(
      `Yakin ingin menghapus transaksi #${entry.sequence_no} (${entry.act_information || entry.entry_type})?\n\n⚠️ Perhatian: Tindakan ini akan menghitung ulang saldo seluruh transaksi setelahnya!`
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8080/api/v1/cashflow/${entry.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status) {
        fetchCashflow();
        if (onDataChange) onDataChange();
      } else {
        alert("Gagal menghapus: " + data.message);
      }
    } catch (err) {
      console.error("Delete failed", err);
      alert("Terjadi kesalahan saat menghapus");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: number, nextStatus: string) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`http://localhost:8080/api/v1/cashflow/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ remarks: nextStatus })
      });
      fetchCashflow();
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
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
        >
          <CheckCircle2 className="w-3 h-3" /> Lunas
        </button>
      );
    } else if (status === "PENDING") {
      return (
        <button
          onClick={() => handleStatusChange(entry.id, "PAID")}
          title="Klik untuk tandai Lunas"
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
        >
          <Clock className="w-3 h-3" /> Sebagian
        </button>
      );
    } else {
      return (
        <button
          onClick={() => handleStatusChange(entry.id, "PAID")}
          title="Klik untuk tandai Lunas"
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
        >
          <AlertCircle className="w-3 h-3" /> Belum Lunas
        </button>
      );
    }
  };

  const safeEntries = Array.isArray(entries) ? entries : [];

  return (
    <>
      <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs">
        {/* Top Actions Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4 bg-slate-50/50">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
              <Activity className="w-5 h-5 text-blue-600" />
              <span>Transaksi Cashflow & Shipment</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Pencatatan kas rolling, tracking biaya pengiriman, T.O.P vendor, serta impor/ekspor data Excel
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
              className="text-xs bg-white hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl transition-colors font-bold border border-slate-200 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" /> Impor Excel
            </button>
            <button 
              onClick={handleExport}
              className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl transition-colors font-bold border border-emerald-200 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" /> Ekspor Excel
            </button>
            <button 
              onClick={() => setIsTopUpOpen(true)}
              className="text-xs bg-white hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl transition-colors font-bold border border-slate-200 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5 text-slate-600" /> Tambah Modal
            </button>
            <button 
              onClick={() => setIsShipmentOpen(true)}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl transition-all font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" /> Catat Shipment
            </button>
          </div>
        </div>

        {/* Filter Bar Component */}
        <div className="p-4 pb-0">
          <FilterBar
            filters={filters}
            onFilterChange={(f) => {
              setFilters(f);
              setPage(1);
            }}
            onReset={() => {
              setFilters({
                date_from: "",
                date_to: "",
                entry_type: "",
                remarks: "",
                vendor_name: ""
              });
              setPage(1);
            }}
          />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 border-y border-slate-200/80">
              <tr>
                <th 
                  onClick={toggleSort}
                  className="px-4 py-3.5 font-bold cursor-pointer hover:text-blue-600 transition-colors group select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Tanggal & Seq</span>
                    {sortDir === "ASC" ? (
                      <ArrowUp className="w-3 h-3 text-blue-600" />
                    ) : (
                      <ArrowDown className="w-3 h-3 text-blue-600" />
                    )}
                  </div>
                </th>
                <th className="px-3 py-3.5 font-bold">Tipe</th>
                <th className="px-4 py-3.5 font-bold min-w-[200px]">Vendor & Aktivitas</th>
                <th className="px-3 py-3.5 font-bold text-right">Grand Cost (HPP)</th>
                <th className="px-3 py-3.5 font-bold text-right">Grand Selling</th>
                <th className="px-3 py-3.5 font-bold text-right">Profit / Margin</th>
                <th className="px-3 py-3.5 font-bold text-center">T.O.P / Due</th>
                <th className="px-4 py-3.5 font-bold text-right text-rose-600">Debit (Keluar)</th>
                <th className="px-4 py-3.5 font-bold text-right text-emerald-600">Kredit (Masuk)</th>
                <th className="px-4 py-3.5 font-bold text-right text-blue-700">Rolling Saldo</th>
                <th className="px-3 py-3.5 font-bold text-center">Status</th>
                <th className="px-4 py-3.5 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </td>
                </tr>
              ) : safeEntries.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-slate-400">
                    Tidak ada transaksi yang sesuai.
                  </td>
                </tr>
              ) : (
                safeEntries.map((entry: any) => (
                  <tr 
                    key={entry.id} 
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("button")) return;
                      setSelectedEntry(entry);
                      setIsDetailOpen(true);
                    }}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-slate-400 text-[10px]">#{entry.sequence_no}</span>
                        <span className="font-bold text-slate-900">{formatDate(entry.date_of_entry)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        entry.entry_type === "TOP_UP" 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}>
                        {entry.entry_type === "TOP_UP" ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                        {entry.entry_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 text-xs truncate max-w-xs">
                        {entry.vendor_name_raw || entry.act_information || "-"}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 truncate max-w-xs">
                        <span>{entry.act_information}</span>
                        {entry.act_explaination && (
                          <span className="text-slate-400">({entry.act_explaination})</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-medium text-slate-600">
                      {entry.entry_type === "SHIPMENT" ? formatCurrency(entry.grand_cost) : "-"}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-medium text-blue-600">
                      {entry.entry_type === "SHIPMENT" ? formatCurrency(entry.grand_selling) : "-"}
                    </td>
                    <td className="px-3 py-3 text-right font-mono whitespace-nowrap">
                      {entry.entry_type === "SHIPMENT" ? (
                        <div>
                          <span className="text-emerald-600 font-bold">{formatCurrency(entry.profit)}</span>
                          <span className="text-[10px] text-blue-600 font-semibold block">
                            {(entry.margin_pct * 100).toFixed(1)}%
                          </span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      {entry.entry_type === "SHIPMENT" ? (
                        <div>
                          <span className="text-slate-700 text-xs font-semibold">{entry.top_days ? `${entry.top_days}h` : "-"}</span>
                          {entry.due_date && (
                            <span className="text-[10px] text-amber-700 font-semibold block">{formatDate(entry.due_date)}</span>
                          )}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-rose-600 font-bold">
                      {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600 font-bold">
                      {entry.kredit > 0 ? formatCurrency(entry.kredit) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-black text-blue-700 text-xs">
                      {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(entry.saldo)}
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      {renderRemarksBadge(entry)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedEntry(entry);
                            setIsDetailOpen(true);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Lihat Detail"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEntry(entry);
                            setIsEditOpen(true);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
              className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors text-xs font-bold shadow-xs cursor-pointer"
            >
              Sebelumnya
            </button>
            <span className="px-2 py-1 text-xs font-bold text-slate-600">Hal {page}</span>
            <button 
              disabled={safeEntries.length < 15}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors text-xs font-bold shadow-xs cursor-pointer"
            >
              Selanjutnya
            </button>
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
    </>
  );
}
