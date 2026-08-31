"use client";

import { useState } from "react";
import { X, Loader2, Wallet } from "lucide-react";

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TopUpModal({ isOpen, onClose, onSuccess }: TopUpModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    date_of_entry: new Date().toISOString().split("T")[0],
    kredit: "",
    act_information: "",
    act_explaination: ""
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8080/api/v1/cashflow/topup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date_of_entry: new Date(formData.date_of_entry).toISOString(),
          kredit: parseFloat(formData.kredit.replace(/[^0-9.-]+/g, "")),
          act_information: formData.act_information.trim() || "TOP UP",
          act_explaination: formData.act_explaination.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create Top-Up");

      onSuccess();
      onClose();
      setFormData({ date_of_entry: new Date().toISOString().split("T")[0], kredit: "", act_information: "", act_explaination: "" });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 relative shadow-2xl border border-slate-100">
        <button 
          onClick={onClose} 
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Tambah Modal (Top-Up)</h2>
            <p className="text-xs text-slate-500">Injeksi kas masuk ke saldo kas berjalan</p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Masuk</label>
            <input
              type="date"
              required
              value={formData.date_of_entry}
              onChange={e => setFormData({ ...formData, date_of_entry: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nominal Kredit (Masuk)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">Rp</span>
              <input
                type="number"
                required
                min="0"
                value={formData.kredit}
                onChange={e => setFormData({ ...formData, kredit: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="10000000"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Keterangan Aktivitas (Opsional)</label>
            <input
              type="text"
              value={formData.act_information}
              onChange={e => setFormData({ ...formData, act_information: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Inject modal dari Direksi / Owner"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Rincian / Catatan Tambahan (Opsional)</label>
            <textarea
              value={formData.act_explaination}
              onChange={e => setFormData({ ...formData, act_explaination: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[70px] resize-none"
              placeholder="Catatan tambahan rekening transfer..."
            />
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
              className="flex-1 py-2.5 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan Modal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
