"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Edit3, Trash2 } from "lucide-react";
import { formatRupiah, calculateProfit, calculateMarginPct, calculateDueDate } from "@/hooks/useAutoCalculate";
import { VendorSelect } from "@/components/VendorSelect";

interface CashflowEntry {
  id: string;
  sequence_no: number;
  entry_type: "TOP_UP" | "SHIPMENT";
  date_of_entry: string;
  act_information: string;
  act_explaination: string;
  vendor_name_raw: string;
  top_days: number;
  due_date: string | null;
  grand_cost: number;
  grand_selling: number;
  kredit: number;
  debit: number;
  remarks: "PAID" | "UNPAID" | "PENDING";
}

interface EditEntryModalProps {
  isOpen: boolean;
  entry: CashflowEntry | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditEntryModal({ isOpen, entry, onClose, onSuccess }: EditEntryModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    date_of_entry: "",
    vendor_name_raw: "",
    act_information: "",
    act_explaination: "",
    grand_cost: "",
    grand_selling: "",
    debit: "",
    kredit: "",
    top_days: "",
    due_date: "",
    remarks: "UNPAID"
  });

  useEffect(() => {
    if (entry) {
      setFormData({
        date_of_entry: entry.date_of_entry ? entry.date_of_entry.split("T")[0] : "",
        vendor_name_raw: entry.vendor_name_raw || "",
        act_information: entry.act_information || "",
        act_explaination: entry.act_explaination || "",
        grand_cost: entry.grand_cost ? String(entry.grand_cost) : "",
        grand_selling: entry.grand_selling ? String(entry.grand_selling) : "",
        debit: entry.debit ? String(entry.debit) : "",
        kredit: entry.kredit ? String(entry.kredit) : "",
        top_days: entry.top_days ? String(entry.top_days) : "",
        due_date: entry.due_date ? entry.due_date.split("T")[0] : "",
        remarks: entry.remarks || "UNPAID"
      });
    }
  }, [entry]);

  if (!isOpen || !entry) return null;

  const isShipment = entry.entry_type === "SHIPMENT";
  const costNum = parseFloat(formData.grand_cost || "0");
  const sellNum = parseFloat(formData.grand_selling || "0");
  const profitNum = calculateProfit(sellNum, costNum);
  const marginNum = calculateMarginPct(profitNum, sellNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const payload: any = {
        date_of_entry: new Date(formData.date_of_entry).toISOString(),
        act_information: formData.act_information,
        act_explaination: formData.act_explaination,
        remarks: formData.remarks
      };

      if (isShipment) {
        payload.vendor_name_raw = formData.vendor_name_raw;
        payload.grand_cost = costNum;
        payload.grand_selling = sellNum;
        payload.debit = parseFloat(formData.debit || formData.grand_cost || "0");
        payload.top_days = parseInt(formData.top_days || "0", 10);
        payload.due_date = formData.due_date ? new Date(formData.due_date).toISOString() : null;
      } else {
        payload.kredit = parseFloat(formData.kredit.replace(/[^0-9.-]+/g, "") || "0");
      }

      const res = await fetch(`http://localhost:8080/api/v1/cashflow/${entry.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal memperbarui transaksi");

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Yakin ingin menghapus transaksi #${entry.sequence_no}? Data yang dihapus akan tercatat di log audit.`)) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8080/api/v1/cashflow/${entry.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Gagal menghapus transaksi");
      }

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
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Edit Transaksi #{entry.sequence_no}</h2>
            <p className="text-xs text-slate-500 font-medium">Perbarui rincian kas atau operasional shipment</p>
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isShipment && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Vendor</label>
                <VendorSelect
                  value={formData.vendor_name_raw}
                  onChange={v => setFormData({ ...formData, vendor_name_raw: v })}
                  placeholder="Pilih atau ketik vendor..."
                />
              </div>
            )}
            <div className={!isShipment ? "md:col-span-2" : ""}>
              <label className="block text-xs font-bold text-slate-700 mb-1">Act Information</label>
              <input
                type="text"
                required
                value={formData.act_information}
                onChange={e => setFormData({ ...formData, act_information: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Act Explaination</label>
            <input
              type="text"
              value={formData.act_explaination}
              onChange={e => setFormData({ ...formData, act_explaination: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {isShipment ? (
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Grand Cost (HPP)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.grand_cost}
                    onChange={e => setFormData({ ...formData, grand_cost: e.target.value, debit: formData.debit || e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Grand Selling (Jual)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.grand_selling}
                    onChange={e => setFormData({ ...formData, grand_selling: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Debit (Kas Keluar)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.debit}
                    onChange={e => setFormData({ ...formData, debit: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-rose-600 font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
                  <span className="text-[11px] text-emerald-700 font-semibold block">Profit</span>
                  <span className="text-sm font-black text-emerald-700 font-mono">{formatRupiah(profitNum)}</span>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5">
                  <span className="text-[11px] text-blue-700 font-semibold block">Margin</span>
                  <span className="text-sm font-black text-blue-700 font-mono">{marginNum}%</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nominal Kredit (Masuk)</label>
              <input
                type="number"
                min="0"
                value={formData.kredit}
                onChange={e => setFormData({ ...formData, kredit: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          )}

          {isShipment && (
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full bg-amber-50/60 border border-amber-200 rounded-xl py-2 px-3 text-xs text-amber-900 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={formData.remarks}
                  onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="UNPAID">Belum Lunas</option>
                  <option value="PENDING">Sebagian</option>
                  <option value="PAID">Lunas</option>
                </select>
              </div>
            </div>
          )}

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
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Perbarui Transaksi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
