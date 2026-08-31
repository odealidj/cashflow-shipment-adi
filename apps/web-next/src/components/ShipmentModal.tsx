"use client";

import { useState } from "react";
import { X, Loader2, Truck, TrendingUp, DollarSign } from "lucide-react";
import { formatRupiah, calculateProfit, calculateMarginPct, calculateDueDate } from "@/hooks/useAutoCalculate";
import { VendorSelect } from "@/components/VendorSelect";

interface ShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ShipmentModal({ isOpen, onClose, onSuccess }: ShipmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    date_of_entry: new Date().toISOString().split("T")[0],
    vendor_name_raw: "",
    act_information: "",
    act_explaination: "",
    grand_cost: "",
    grand_selling: "",
    debit: "",
    top_days: "14",
    due_date: "",
    remarks: "UNPAID"
  });

  if (!isOpen) return null;

  const costNum = parseFloat(formData.grand_cost || "0");
  const sellNum = parseFloat(formData.grand_selling || "0");
  const profitNum = calculateProfit(sellNum, costNum);
  const marginNum = calculateMarginPct(profitNum, sellNum);
  const autoDueDate = calculateDueDate(formData.date_of_entry, parseInt(formData.top_days || "0", 10));
  const effectiveDueDate = formData.due_date || autoDueDate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8080/api/v1/cashflow/shipment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date_of_entry: new Date(formData.date_of_entry).toISOString(),
          vendor_name_raw: formData.vendor_name_raw,
          act_information: formData.act_information,
          act_explaination: formData.act_explaination,
          grand_cost: costNum,
          grand_selling: sellNum,
          debit: parseFloat(formData.debit || formData.grand_cost || "0"),
          top_days: parseInt(formData.top_days || "0", 10),
          due_date: effectiveDueDate ? new Date(effectiveDueDate).toISOString() : null,
          remarks: formData.remarks
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal mencatat shipment");

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl p-6 relative my-auto border border-slate-100 shadow-2xl">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Catat Pengiriman (Shipment)</h2>
            <p className="text-xs text-slate-500 font-medium">Pencatatan biaya transport, pendapatan, dan jatuh tempo vendor</p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Transaksi</label>
              <input
                type="date"
                required
                value={formData.date_of_entry}
                onChange={e => setFormData({ ...formData, date_of_entry: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama Vendor / Transporter</label>
              <VendorSelect
                value={formData.vendor_name_raw}
                onChange={v => setFormData({ ...formData, vendor_name_raw: v })}
                required
                placeholder="Pilih atau ketik vendor..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Act Information</label>
              <input
                type="text"
                required
                placeholder="Mis. Angkut Semen Cibinong-SBY"
                value={formData.act_information}
                onChange={e => setFormData({ ...formData, act_information: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Act Explaination</label>
              <input
                type="text"
                placeholder="Rute, muatan, no referensi..."
                value={formData.act_explaination}
                onChange={e => setFormData({ ...formData, act_explaination: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Rincian Finansial & Kalkulasi Otomatis</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Grand Cost / HPP</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">Rp</span>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="28150000"
                    value={formData.grand_cost}
                    onChange={e => {
                      const v = e.target.value;
                      setFormData({
                        ...formData,
                        grand_cost: v,
                        debit: (!formData.debit || formData.debit === formData.grand_cost) ? v : formData.debit
                      });
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Grand Selling (Jual)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">Rp</span>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="30000000"
                    value={formData.grand_selling}
                    onChange={e => setFormData({ ...formData, grand_selling: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Debit (Kas Keluar)</label>
                  <span className="text-[9px] text-slate-400 font-semibold">Kas Riil</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">Rp</span>
                  <input
                    type="number"
                    min="0"
                    placeholder={formData.grand_cost || "0"}
                    value={formData.debit}
                    onChange={e => setFormData({ ...formData, debit: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-rose-600 font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Live Auto Profit & Margin Display */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
                <span className="text-[11px] text-emerald-700 font-semibold block">Profit Estimasi</span>
                <span className="text-sm font-black text-emerald-700 font-mono">
                  {formatRupiah(profitNum)}
                </span>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5">
                <span className="text-[11px] text-blue-700 font-semibold block">Margin Persentase</span>
                <span className="text-sm font-black text-blue-700 font-mono">
                  {marginNum}%
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">T.O.P (Hari)</label>
              <input
                type="number"
                min="0"
                value={formData.top_days}
                onChange={e => setFormData({ ...formData, top_days: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Jatuh Tempo (Due Date)</label>
              <input
                type="date"
                value={effectiveDueDate}
                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full bg-amber-50/60 border border-amber-200 rounded-xl py-2 px-3 text-xs text-amber-900 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status Pembayaran</label>
              <select
                value={formData.remarks}
                onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="UNPAID">Belum Lunas (UNPAID)</option>
                <option value="PENDING">Sebagian (PENDING)</option>
                <option value="PAID">Lunas (PAID)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 flex gap-2.5">
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
              className="flex-1 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan Shipment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
