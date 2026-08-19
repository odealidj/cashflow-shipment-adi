"use client";

import { useEffect, useState, useRef } from "react";
import { ArrowUpRight, ArrowDownRight, ArrowRight, Wallet, Activity, Download, Upload } from "lucide-react";

import { TopUpModal } from "./TopUpModal";
import { ShipmentModal } from "./ShipmentModal";

export function CashflowTable() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal States
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isShipmentOpen, setIsShipmentOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCashflow = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8080/api/v1/cashflow?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status) {
        setEntries(data.data.entries || []);
        setTotal(data.data.total);
      }
    } catch (err) {
      console.error("Failed to fetch cashflow", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8080/api/v1/cashflow/export", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to export");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Cashflow_Export.xlsx";
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
        window.location.reload(); 
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

  useEffect(() => {
    fetchCashflow();
  }, [page]);

  const handleSuccess = () => {
    fetchCashflow();
    // Optional: trigger dashboard cards reload via context or props in the future
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit", month: "short", year: "numeric"
    });
  };

  return (
    <>
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/5 animate-fade-in shadow-2xl">
        <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand-400" />
              Transaction History
            </h3>
            <p className="text-sm text-gray-400 mt-1">Real-time rolling cashflow records</p>
          </div>
          <div className="flex gap-3">
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              hidden 
              ref={fileInputRef} 
              onChange={handleImport} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="text-sm bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-4 py-2 rounded-lg transition-colors font-medium border border-blue-500/20 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" /> Import Excel
            </button>
            <button 
              onClick={handleExport}
              className="text-sm bg-green-500/10 hover:bg-green-500/20 text-green-400 px-4 py-2 rounded-lg transition-colors font-medium border border-green-500/20 flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Export Excel
            </button>
            <button 
              onClick={() => setIsTopUpOpen(true)}
              className="text-sm bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors font-medium border border-white/10 flex items-center gap-2"
            >
              <Wallet className="w-4 h-4" /> Add Top-Up
            </button>
            <button 
              onClick={() => setIsShipmentOpen(true)}
              className="text-sm bg-gradient-to-r from-brand-600 to-purple-600 hover:opacity-90 text-white px-4 py-2 rounded-lg transition-all font-medium shadow-lg shadow-brand-500/30 flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" /> New Shipment
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="text-xs uppercase bg-black/20 text-gray-400 sticky top-0">
              <tr>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Vendor</th>
                <th className="px-6 py-4 font-semibold text-right">Debit (Out)</th>
                <th className="px-6 py-4 font-semibold text-right">Kredit (In)</th>
                <th className="px-6 py-4 font-semibold text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No transactions found yet. Create your first entry above.
                  </td>
                </tr>
              ) : (
                entries.map((entry: any) => (
                  <tr key={entry.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(entry.date_of_entry)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        entry.entry_type === "TOP_UP" 
                          ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                          : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      }`}>
                        {entry.entry_type === "TOP_UP" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {entry.entry_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-white">
                      <div>{entry.vendor_name_raw || "-"}</div>
                      <div className="text-xs text-gray-500 font-normal">{entry.act_information}</div>
                    </td>
                    <td className="px-6 py-4 text-right text-red-400 font-mono">{entry.debit > 0 ? formatCurrency(entry.debit) : "-"}</td>
                    <td className="px-6 py-4 text-right text-green-400 font-mono">{entry.kredit > 0 ? formatCurrency(entry.kredit) : "-"}</td>
                    <td className="px-6 py-4 text-right font-mono font-semibold text-white">{formatCurrency(entry.saldo)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-between items-center bg-black/10">
          <span className="text-sm text-gray-400">
            Showing <span className="font-medium text-white">{entries.length}</span> of <span className="font-medium text-white">{total}</span> entries
          </span>
          <div className="flex gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 disabled:opacity-50 transition-colors text-sm"
            >
              Previous
            </button>
            <button 
              disabled={entries.length < 10}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 disabled:opacity-50 transition-colors text-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <TopUpModal 
        isOpen={isTopUpOpen} 
        onClose={() => setIsTopUpOpen(false)} 
        onSuccess={handleSuccess} 
      />
      
      <ShipmentModal 
        isOpen={isShipmentOpen} 
        onClose={() => setIsShipmentOpen(false)} 
        onSuccess={handleSuccess} 
      />
    </>
  );
}
