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
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Edit2, 
  Trash2, 
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle
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
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("ASC"); // Default ASC as requested

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
      const qs = buildQueryString();
      const res = await fetch(`http://localhost:8080/api/v1/cashflow?${qs}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status) {
        setEntries(data.data.entries || []);
        setTotal(data.data.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch cashflow", err);
    } finally {
      setLoading(false);
    }
  }, [buildQueryString]);

  useEffect(() => {
    fetchCashflow();
  }, [fetchCashflow]);

  const handleExport = async () => {
    try {
      const token = localStorage.getItem("token");
      const qs = buildQueryString();
      const res = await fetch(`http://localhost:8080/api/v1/cashflow/export?${qs}`, {
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
        alert("Excel imported successfully!");
        fetchCashflow();
        if (onDataChange) onDataChange();
      } else {
        alert("Import failed: " + data.message);
      }
    } catch (err) {
      console.error("Import failed", err);
      alert("Failed to import Excel");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (entry: any) => {
    const confirmed = window.confirm(
      `Yakin ingin menghapus transaksi #${entry.sequence_no} (${entry.act_information || entry.entry_type})?\n\n⚠️ Perhatian: Tindakan ini akan menghitung ulang (recalculate) saldo seluruh transaksi setelahnya!`
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
      const res = await fetch(`http://localhost:8080/api/v1/cashflow/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ remarks: nextStatus })
      });
      const data = await res.json();
      if (data.status) {
        fetchCashflow();
        if (onDataChange) onDataChange();
        if (selectedEntry && selectedEntry.id === id) {
          setSelectedEntry({ ...selectedEntry, remarks: nextStatus });
        }
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const toggleSort = () => {
    setSortDir(prev => prev === "ASC" ? "DESC" : "ASC");
    setPage(1);
  };

  const handleDataRefresh = () => {
    fetchCashflow();
    if (onDataChange) onDataChange();
  };

  const formatCurrency = (amount: number) => {
    if (!amount || amount === 0) return "-";
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit", month: "short", year: "numeric"
    });
  };

  const renderRemarksBadge = (entry: any) => {
    const status = entry.remarks;
    if (entry.entry_type === "TOP_UP") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">
          <CheckCircle2 className="w-3 h-3" /> PAID
        </span>
      );
    }

    if (status === "PAID") {
      return (
        <button
          onClick={() => handleStatusChange(entry.id, "UNPAID")}
          title="Click to toggle UNPAID"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors"
        >
          <CheckCircle2 className="w-3 h-3" /> PAID
        </button>
      );
    } else if (status === "PENDING") {
      return (
        <button
          onClick={() => handleStatusChange(entry.id, "PAID")}
          title="Click to mark PAID"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors"
        >
          <Clock className="w-3 h-3" /> PENDING
        </button>
      );
    } else {
      return (
        <button
          onClick={() => handleStatusChange(entry.id, "PAID")}
          title="Click to mark PAID"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
        >
          <AlertCircle className="w-3 h-3" /> UNPAID
        </button>
      );
    }
  };

  return (
    <>
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/5 animate-fade-in shadow-2xl">
        <div className="px-6 py-5 border-b border-white/10 flex flex-wrap justify-between items-center gap-4 bg-white/5">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand-400" />
              Cashflow Shipment Control
            </h3>
            <p className="text-sm text-gray-400 mt-1">Continuous rolling cashbook ledger</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              hidden 
              ref={fileInputRef} 
              onChange={handleImport} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3.5 py-2 rounded-xl transition-colors font-medium border border-blue-500/20 flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" /> Import Excel
            </button>
            <button 
              onClick={handleExport}
              className="text-xs bg-green-500/10 hover:bg-green-500/20 text-green-400 px-3.5 py-2 rounded-xl transition-colors font-medium border border-green-500/20 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export Excel
            </button>
            <button 
              onClick={() => setIsTopUpOpen(true)}
              className="text-xs bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl transition-colors font-medium border border-white/10 flex items-center gap-1.5"
            >
              <Wallet className="w-3.5 h-3.5" /> Add Top-Up
            </button>
            <button 
              onClick={() => setIsShipmentOpen(true)}
              className="text-xs bg-gradient-to-r from-brand-600 to-purple-600 hover:opacity-90 text-white px-3.5 py-2 rounded-xl transition-all font-medium shadow-lg shadow-brand-500/30 flex items-center gap-1.5"
            >
              <ArrowRight className="w-3.5 h-3.5" /> New Shipment
            </button>
          </div>
        </div>

        {/* Filter Bar Component */}
        <div className="p-6 pb-2">
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
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="text-[11px] uppercase bg-black/40 text-gray-400 border-y border-white/10">
              <tr>
                <th 
                  onClick={toggleSort}
                  className="px-4 py-3.5 font-semibold cursor-pointer hover:text-white transition-colors group select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Date & Seq</span>
                    {sortDir === "ASC" ? (
                      <ArrowUp className="w-3 h-3 text-brand-400" />
                    ) : (
                      <ArrowDown className="w-3 h-3 text-brand-400" />
                    )}
                  </div>
                </th>
                <th className="px-3 py-3.5 font-semibold">Type</th>
                <th className="px-4 py-3.5 font-semibold min-w-[200px]">Vendor & Route</th>
                <th className="px-3 py-3.5 font-semibold text-right">Cost (HPP)</th>
                <th className="px-3 py-3.5 font-semibold text-right">Selling</th>
                <th className="px-3 py-3.5 font-semibold text-right">Profit / Margin</th>
                <th className="px-3 py-3.5 font-semibold text-center">T.O.P / Due</th>
                <th className="px-4 py-3.5 font-semibold text-right text-red-400">Debit (Out)</th>
                <th className="px-4 py-3.5 font-semibold text-right text-green-400">Kredit (In)</th>
                <th className="px-4 py-3.5 font-semibold text-right text-white">Saldo</th>
                <th className="px-3 py-3.5 font-semibold text-center">Status</th>
                <th className="px-4 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-gray-500">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                entries.map((entry: any) => (
                  <tr 
                    key={entry.id} 
                    className="hover:bg-white/[0.04] transition-colors group cursor-pointer"
                    onClick={(e) => {
                      // Don't open detail if clicked on actions or status toggle
                      if ((e.target as HTMLElement).closest("button")) return;
                      setSelectedEntry(entry);
                      setIsDetailOpen(true);
                    }}
                  >
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-gray-500 text-[10px]">#{entry.sequence_no}</span>
                        <span className="font-medium text-white">{formatDate(entry.date_of_entry)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        entry.entry_type === "TOP_UP" 
                          ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                          : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      }`}>
                        {entry.entry_type === "TOP_UP" ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                        {entry.entry_type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-white text-xs">
                        {entry.vendor_name_raw || entry.act_information || "-"}
                      </div>
                      <div className="text-[11px] text-gray-400 flex items-center gap-1">
                        <span>{entry.act_information}</span>
                        {entry.act_explaination && (
                          <span className="text-gray-500">({entry.act_explaination})</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono text-gray-300">
                      {entry.entry_type === "SHIPMENT" ? formatCurrency(entry.grand_cost) : "-"}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono text-blue-300">
                      {entry.entry_type === "SHIPMENT" ? formatCurrency(entry.grand_selling) : "-"}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono whitespace-nowrap">
                      {entry.entry_type === "SHIPMENT" ? (
                        <div>
                          <span className="text-green-400 font-semibold">{formatCurrency(entry.profit)}</span>
                          <span className="text-[10px] text-purple-300 block">
                            {(entry.margin_pct * 100).toFixed(1)}%
                          </span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-center whitespace-nowrap">
                      {entry.entry_type === "SHIPMENT" ? (
                        <div>
                          <span className="text-gray-300 text-xs">{entry.top_days ? `${entry.top_days}d` : "-"}</span>
                          {entry.due_date && (
                            <span className="text-[10px] text-amber-300/80 block">{formatDate(entry.due_date)}</span>
                          )}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-red-400 font-medium">
                      {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-green-400 font-medium">
                      {entry.kredit > 0 ? formatCurrency(entry.kredit) : "-"}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-white text-xs">
                      {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(entry.saldo)}
                    </td>
                    <td className="px-3 py-3.5 text-center whitespace-nowrap">
                      {renderRemarksBadge(entry)}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedEntry(entry);
                            setIsDetailOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEntry(entry);
                            setIsEditOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                          title="Edit Entry"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete Entry"
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
        <div className="px-6 py-4 border-t border-white/10 flex flex-wrap justify-between items-center gap-3 bg-black/20">
          <span className="text-xs text-gray-400">
            Showing <span className="font-semibold text-white">{entries.length}</span> of <span className="font-semibold text-white">{total}</span> entries (Sorted {sortDir})
          </span>
          <div className="flex gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 disabled:opacity-40 transition-colors text-xs font-medium"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-xs text-gray-400">Page {page}</span>
            <button 
              disabled={entries.length < 15}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 disabled:opacity-40 transition-colors text-xs font-medium"
            >
              Next
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
