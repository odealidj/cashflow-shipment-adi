"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Truck, TrendingUp, DollarSign, Wallet, ArrowRight, AlertTriangle } from "lucide-react";
import { formatRupiah, calculateProfit, calculateMarginPct, calculateDueDate } from "@/hooks/useAutoCalculate";
import { formatThousand, cleanThousand, terbilangRingkas } from "@/hooks/useTerbilang";
import { VendorSelect } from "@/components/VendorSelect";
import { ActivityPresetSelect } from "@/components/shared/ActivityPresetSelect";

interface ShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ShipmentModal({ isOpen, onClose, onSuccess }: ShipmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentSaldo, setCurrentSaldo] = useState<number | null>(null);
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

  // Fetch current saldo whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    const fetchSaldo = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:8080/api/v1/cashflow/summary", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.status && data.data) {
          setCurrentSaldo(data.data.current_saldo || 0);
        }
      } catch (e) {
        console.error("Gagal mengambil saldo terkini:", e);
      }
    };
    fetchSaldo();
  }, [isOpen]);

  if (!isOpen) return null;

  const costNum = parseFloat(formData.grand_cost || "0");
  const sellNum = parseFloat(formData.grand_selling || "0");
  const profitNum = calculateProfit(sellNum, costNum);
  const marginNum = calculateMarginPct(profitNum, sellNum);
  const autoDueDate = calculateDueDate(formData.date_of_entry, parseInt(formData.top_days || "0", 10));
  const effectiveDueDate = formData.due_date || autoDueDate;
  const projectedSaldo = (currentSaldo ?? 0) - costNum;

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
          {/* SEKSI 1: IDENTITAS OPERASIONAL & VENDOR */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Transaksi *</label>
                <input
                  type="date"
                  required
                  value={formData.date_of_entry}
                  onChange={e => setFormData({ ...formData, date_of_entry: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-600 focus:outline-none font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Vendor / Transporter *</label>
                <VendorSelect
                  value={formData.vendor_name_raw}
                  onChange={v => setFormData({ ...formData, vendor_name_raw: v })}
                  required
                  placeholder="Pilih atau ketik vendor..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Keterangan Aktivitas / Armada *</label>
                <ActivityPresetSelect
                  category="ACT_INFO"
                  required
                  placeholder="Pilih atau ketik armada (mis. Tronton Bak)..."
                  value={formData.act_information}
                  onChange={v => setFormData({ ...formData, act_information: v })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rincian / Catatan Tambahan (Rute)</label>
                <ActivityPresetSelect
                  category="ACT_EXPLAIN"
                  placeholder="Pilih atau ketik rute (mis. CIBINONG - SBY)..."
                  value={formData.act_explaination}
                  onChange={v => setFormData({ ...formData, act_explaination: v })}
                />
              </div>
            </div>
          </div>

          {/* SEKSI 2: INPUT FINANSIAL & TERMIN (SEMUA INPUT USER DIKELOMPOKKAN) */}
          <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-sky-700" />
                Input Finansial & Termin Pembayaran
              </span>
              <span className="text-[10px] text-slate-400 font-medium">* Kolom wajib input</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Grand Cost / HPP */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Grand Cost (HPP) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="28.150.000"
                    value={formatThousand(formData.grand_cost)}
                    onChange={e => {
                      const clean = cleanThousand(e.target.value);
                      setFormData({
                        ...formData,
                        grand_cost: clean,
                        debit: clean
                      });
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-sky-600 focus:outline-none"
                  />
                </div>
                {/* Indikator Terbilang Ringkas */}
                {formData.grand_cost && Number(formData.grand_cost) > 0 && (
                  <div className="mt-1 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sky-50/80 border border-sky-100 text-[10px] text-sky-900 font-bold animate-fade-in">
                    <span className="text-sky-500 font-normal">Terbaca:</span>
                    <span>{terbilangRingkas(formData.grand_cost)}</span>
                  </div>
                )}
              </div>

              {/* Grand Selling */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Grand Selling (Harga Jual) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="30.000.000"
                    value={formatThousand(formData.grand_selling)}
                    onChange={e => {
                      const clean = cleanThousand(e.target.value);
                      setFormData({
                        ...formData,
                        grand_selling: clean
                      });
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-sky-600 focus:outline-none"
                  />
                </div>
                {/* Indikator Terbilang Ringkas */}
                {formData.grand_selling && Number(formData.grand_selling) > 0 && (
                  <div className="mt-1 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50/80 border border-emerald-100 text-[10px] text-emerald-900 font-bold animate-fade-in">
                    <span className="text-emerald-500 font-normal">Terbaca:</span>
                    <span>{terbilangRingkas(formData.grand_selling)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-0.5">
              {/* T.O.P */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Termin Pembayaran (T.O.P) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="14"
                    value={formData.top_days}
                    onChange={e => setFormData({ ...formData, top_days: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 font-bold focus:ring-2 focus:ring-sky-600 focus:outline-none pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Hari</span>
                </div>
              </div>

              {/* Status Pembayaran */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status Pembayaran</label>
                <select
                  value={formData.remarks}
                  onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 font-bold focus:ring-2 focus:ring-sky-600 focus:outline-none cursor-pointer"
                >
                  <option value="UNPAID">Belum Lunas (UNPAID)</option>
                  <option value="PENDING">Sebagian (PENDING)</option>
                  <option value="PAID">Lunas (PAID)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SEKSI 3: HASIL KALKULASI OTOMATIS SISTEM (READ-ONLY DASHBOARD BADGES) */}
          <div className="p-3.5 bg-sky-950/5 border border-sky-200/60 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-sky-900 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-sky-700" />
                Hasil Kalkulasi Otomatis Sistem
              </span>
              <span className="text-[10px] text-sky-700 font-semibold bg-sky-100/70 px-2 py-0.5 rounded-md">
                Auto-calculated
              </span>
            </div>

            {/* LIVE SALDO IMPACT BAR */}
            <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-sky-700" />
                  Simulasi Dampak ke Saldo Kas
                </span>
                {costNum > 0 && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    projectedSaldo >= 0 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                  }`}>
                    {projectedSaldo >= 0 ? '✓ Saldo Kas Cukup' : '⚠️ Saldo Kas Kurang (Defisit)'}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                {/* Saldo Saat Ini */}
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block font-medium">Saldo Kas Saat Ini</span>
                  <span className="font-bold text-slate-700 font-mono text-[13px]">
                    {currentSaldo !== null ? formatRupiah(currentSaldo) : "Memuat..."}
                  </span>
                </div>

                <div className="text-slate-300 font-bold hidden sm:block">−</div>

                {/* Biaya Shipment Ini */}
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block font-medium">Debit Biaya (Shipment)</span>
                  <span className="font-bold text-rose-600 font-mono text-[13px]">
                    − {formatRupiah(costNum)}
                  </span>
                </div>

                <ArrowRight className="w-3.5 h-3.5 text-sky-700 shrink-0 hidden sm:block" />

                {/* Estimasi Saldo Akhir */}
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block font-medium">Estimasi Sisa Saldo</span>
                  <span className={`font-black font-mono text-[13px] ${
                    projectedSaldo >= 0 ? 'text-sky-900' : 'text-rose-600'
                  }`}>
                    {currentSaldo !== null ? formatRupiah(projectedSaldo) : "-"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {/* Auto Debit */}
              <div className="bg-white rounded-xl p-2.5 border border-slate-200/70 shadow-2xs">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Debit Kas Keluar</div>
                <div className="text-xs font-black text-rose-700 font-mono mt-0.5">
                  {formatRupiah(costNum)}
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5 leading-none">= Grand Cost</div>
              </div>

              {/* Auto Due Date */}
              <div className="bg-white rounded-xl p-2.5 border border-slate-200/70 shadow-2xs">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Jatuh Tempo</div>
                <div className="text-xs font-black text-amber-700 mt-0.5 truncate">
                  {effectiveDueDate ? new Date(effectiveDueDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5 leading-none">{formData.top_days || 0} hari kerja</div>
              </div>

              {/* Auto Profit */}
              <div className="bg-white rounded-xl p-2.5 border border-emerald-200/70 shadow-2xs">
                <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-tight">Profit Estimasi</div>
                <div className={`text-xs font-black font-mono mt-0.5 ${profitNum >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {formatRupiah(profitNum)}
                </div>
                <div className="text-[9px] text-emerald-600/70 mt-0.5 leading-none">Selling - Cost</div>
              </div>

              {/* Auto Margin */}
              <div className="bg-white rounded-xl p-2.5 border border-blue-200/70 shadow-2xs">
                <div className="text-[10px] text-sky-700 font-bold uppercase tracking-tight">Margin Laba</div>
                <div className={`text-xs font-black font-mono mt-0.5 ${marginNum >= 0 ? 'text-sky-700' : 'text-rose-600'}`}>
                  {marginNum}%
                </div>
                <div className="text-[9px] text-sky-600/70 mt-0.5 leading-none">Persentase</div>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
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
              className="flex-1 py-2.5 rounded-xl font-bold text-xs text-white bg-sky-700 hover:bg-sky-800 active:scale-95 shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan Shipment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
