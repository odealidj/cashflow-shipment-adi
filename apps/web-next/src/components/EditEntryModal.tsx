"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";

interface EditEntryModalProps {
  isOpen: boolean;
  entry: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditEntryModal({ isOpen, entry, onClose, onSuccess }: EditEntryModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    date_of_entry: "",
    entry_type: "SHIPMENT",
    vendor_name_raw: "",
    act_information: "",
    act_explaination: "",
    grand_cost: "",
    grand_selling: "",
    kredit: "",
    debit: "",
    top_days: "14",
    due_date: "",
    remarks: "UNPAID"
  });

  useEffect(() => {
    if (entry) {
      setFormData({
        date_of_entry: entry.date_of_entry ? entry.date_of_entry.split("T")[0] : new Date().toISOString().split("T")[0],
        entry_type: entry.entry_type || "SHIPMENT",
        vendor_name_raw: entry.vendor_name_raw || "",
        act_information: entry.act_information || "",
        act_explaination: entry.act_explaination || "",
        grand_cost: entry.grand_cost ? String(entry.grand_cost) : "0",
        grand_selling: entry.grand_selling ? String(entry.grand_selling) : "0",
        kredit: entry.kredit ? String(entry.kredit) : "0",
        debit: entry.debit ? String(entry.debit) : "0",
        top_days: entry.top_days ? String(entry.top_days) : "0",
        due_date: entry.due_date ? entry.due_date.split("T")[0] : "",
        remarks: entry.remarks || "UNPAID"
      });
      setError("");
    }
  }, [entry, isOpen]);

  if (!isOpen || !entry) return null;

  const isShipment = formData.entry_type === "SHIPMENT";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8080/api/v1/cashflow/${entry.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          entry_type: formData.entry_type,
          date_of_entry: new Date(formData.date_of_entry).toISOString(),
          vendor_name_raw: formData.vendor_name_raw,
          act_information: formData.act_information,
          act_explaination: formData.act_explaination,
          grand_cost: parseFloat(formData.grand_cost || "0"),
          grand_selling: parseFloat(formData.grand_selling || "0"),
          kredit: parseFloat(formData.kredit || "0"),
          debit: parseFloat(formData.debit || "0"),
          top_days: parseInt(formData.top_days || "0", 10),
          due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
          remarks: formData.remarks
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update entry");

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
      <div className="glass-panel w-full max-w-2xl rounded-3xl p-6 relative my-auto border border-white/10 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-2xl font-bold text-white mb-2">Edit Entry #{entry.sequence_no}</h2>
        <p className="text-xs text-amber-400/90 mb-6 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl">
          ⚠️ Mengubah nilai Debit/Kredit akan otomatis menghitung ulang (recalculate cascade) saldo seluruh transaksi setelahnya.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-200 text-sm p-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1 ml-1">Date of Entry</label>
              <input
                type="date"
                required
                value={formData.date_of_entry}
                onChange={e => setFormData({ ...formData, date_of_entry: e.target.value })}
                className="w-full glass-input rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1 ml-1">Entry Type</label>
              <input
                type="text"
                disabled
                value={formData.entry_type}
                className="w-full glass-input rounded-xl py-2.5 px-4 bg-white/5 opacity-75 cursor-not-allowed text-brand-300 font-semibold"
              />
            </div>
          </div>

          {isShipment ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1 ml-1">Vendor Name</label>
                  <input
                    type="text"
                    required
                    value={formData.vendor_name_raw}
                    onChange={e => setFormData({ ...formData, vendor_name_raw: e.target.value })}
                    className="w-full glass-input rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1 ml-1">Act Information</label>
                  <input
                    type="text"
                    required
                    value={formData.act_information}
                    onChange={e => setFormData({ ...formData, act_information: e.target.value })}
                    className="w-full glass-input rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 ml-1">Act Explaination (Route / Detail)</label>
                <input
                  type="text"
                  value={formData.act_explaination}
                  onChange={e => setFormData({ ...formData, act_explaination: e.target.value })}
                  className="w-full glass-input rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-white/10 pt-5 mt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1 ml-1">Grand Cost (HPP)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.grand_cost}
                    onChange={e => setFormData({ ...formData, grand_cost: e.target.value })}
                    className="w-full glass-input rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1 ml-1">Grand Selling</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.grand_selling}
                    onChange={e => setFormData({ ...formData, grand_selling: e.target.value })}
                    className="w-full glass-input rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1 ml-1">T.O.P (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.top_days}
                    onChange={e => setFormData({ ...formData, top_days: e.target.value })}
                    className="w-full glass-input rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1 ml-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full glass-input rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1 ml-1">Payment Status</label>
                  <select
                    value={formData.remarks}
                    onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                    className="w-full glass-input rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-brand-500 bg-black/40 text-white"
                  >
                    <option value="UNPAID" className="bg-gray-900 text-red-400">UNPAID</option>
                    <option value="PENDING" className="bg-gray-900 text-yellow-400">PENDING</option>
                    <option value="PAID" className="bg-gray-900 text-green-400">PAID</option>
                  </select>
                </div>
              </div>

              <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/20">
                <label className="block text-sm font-medium text-red-300 mb-1 ml-1">Debit Amount (Pengurang Saldo)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">Rp</span>
                  <input
                    type="number"
                    min="0"
                    value={formData.debit}
                    onChange={e => setFormData({ ...formData, debit: e.target.value })}
                    className="w-full glass-input rounded-xl py-2.5 pl-12 pr-4 focus:ring-2 focus:ring-red-500 border-red-500/30 bg-red-500/10"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 ml-1">Information / Title</label>
                <input
                  type="text"
                  required
                  value={formData.act_information}
                  onChange={e => setFormData({ ...formData, act_information: e.target.value })}
                  className="w-full glass-input rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 ml-1">Explanation (Optional)</label>
                <textarea
                  value={formData.act_explaination}
                  onChange={e => setFormData({ ...formData, act_explaination: e.target.value })}
                  className="w-full glass-input rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-brand-500 min-h-[80px]"
                />
              </div>

              <div className="bg-green-500/5 p-4 rounded-xl border border-green-500/20">
                <label className="block text-sm font-medium text-green-300 mb-1 ml-1">Kredit Amount (Penambah Saldo)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">Rp</span>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.kredit}
                    onChange={e => setFormData({ ...formData, kredit: e.target.value })}
                    className="w-full glass-input rounded-xl py-2.5 pl-12 pr-4 focus:ring-2 focus:ring-green-500 border-green-500/30 bg-green-500/10 font-mono font-medium"
                  />
                </div>
              </div>
            </>
          )}

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-brand-600 to-purple-600 hover:opacity-90 shadow-lg shadow-brand-500/30 transition-opacity flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
