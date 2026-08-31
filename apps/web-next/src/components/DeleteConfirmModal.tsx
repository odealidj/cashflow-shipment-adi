"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, X, ShieldAlert } from "lucide-react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  entry: any;
  onClose: () => void;
  onConfirm: (entry: any) => Promise<void>;
}

export function DeleteConfirmModal({
  isOpen,
  entry,
  onClose,
  onConfirm
}: DeleteConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [confirmKeyword, setConfirmKeyword] = useState("");
  const [isUnderstandConsequences, setIsUnderstandConsequences] = useState(false);

  if (!isOpen || !entry) return null;

  const requiredKeyword = `HAPUS-${entry.sequence_no}`;
  const isKeywordValid = confirmKeyword.trim().toUpperCase() === requiredKeyword;
  const canDelete = isUnderstandConsequences && isKeywordValid && !loading;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const handleExecuteDelete = async () => {
    if (!canDelete) return;
    try {
      setLoading(true);
      await onConfirm(entry);
      setConfirmKeyword("");
      setIsUnderstandConsequences(false);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setConfirmKeyword("");
    setIsUnderstandConsequences(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 relative my-auto border border-rose-100 shadow-2xl">
        {/* Tombol Tutup */}
        <button
          onClick={handleClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Peringatan Keamanan */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
            <ShieldAlert className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>Hapus Transaksi Permanen</span>
            </h3>
            <p className="text-[11px] text-rose-600 font-bold uppercase tracking-wider">
              Tindakan Kritis & Tidak Dapat Dibatalkan
            </p>
          </div>
        </div>

        {/* Ringkasan Objek yang Dihapus */}
        <div className="bg-rose-50/40 border border-rose-100 rounded-xl p-3.5 space-y-2 mb-4">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">Nomor Sequence:</span>
            <span className="font-mono font-black text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded text-[11px]">
              #{entry.sequence_no}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">Tipe Transaksi:</span>
            <span className="font-bold text-slate-800 uppercase">{entry.entry_type}</span>
          </div>
          <div className="flex justify-between items-start text-xs">
            <span className="text-slate-500 font-medium">Vendor / Aktivitas:</span>
            <span className="font-bold text-slate-900 text-right max-w-[200px] truncate">
              {entry.vendor_name_raw || entry.act_information || "-"}
            </span>
          </div>
          {entry.debit > 0 && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Nominal Kas Keluar:</span>
              <span className="font-mono font-bold text-rose-600">
                {formatCurrency(entry.debit)}
              </span>
            </div>
          )}
          {entry.kredit > 0 && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Nominal Kas Masuk:</span>
              <span className="font-mono font-bold text-emerald-700">
                {formatCurrency(entry.kredit)}
              </span>
            </div>
          )}
        </div>

        {/* Dampak Audit Ketat */}
        <div className="space-y-2 mb-4 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
          <p className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px]">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Dampak Penghapusan Data:
          </p>
          <ul className="list-disc list-inside text-[11px] space-y-1 text-slate-500">
            <li>Menghapus riwayat transaksi dari jurnal cashflow secara permanen.</li>
            <li>Memengaruhi perhitungan <strong className="text-slate-700">Rolling Saldo</strong> berikutnya.</li>
            <li>Tindakan ini tidak dapat dipulihkan melalui menu undo.</li>
          </ul>
        </div>

        {/* Verifikasi Keamanan Pengguna */}
        <div className="space-y-3 mb-5">
          {/* Checkbox Konfirmasi Pemahaman */}
          <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isUnderstandConsequences}
              onChange={(e) => setIsUnderstandConsequences(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
            />
            <span className="text-[11px] leading-tight font-medium text-slate-600">
              Saya memahami resiko ini dan bertanggung jawab penuh atas penghapusan data transaksi ini.
            </span>
          </label>

          {/* Validasi Ketik Keyword */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-600">
              Ketik kode verifikasi: <code className="text-rose-700 font-black bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">{requiredKeyword}</code>
            </label>
            <input
              type="text"
              placeholder={`Ketik ${requiredKeyword}`}
              value={confirmKeyword}
              onChange={(e) => setConfirmKeyword(e.target.value)}
              className="w-full text-xs font-mono font-bold px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 border-slate-200 focus:border-rose-500 focus:ring-rose-500/20 text-slate-800 placeholder-slate-400 uppercase"
            />
          </div>
        </div>

        {/* Aksi Bawah */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200 shadow-2xs"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleExecuteDelete}
            disabled={!canDelete}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs ${
              canDelete
                ? "bg-rose-600 hover:bg-rose-700 text-white cursor-pointer active:scale-95 shadow-rose-600/20"
                : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{loading ? "Menghapus..." : "Konfirmasi Hapus"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
