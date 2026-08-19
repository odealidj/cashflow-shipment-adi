"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";

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
          act_information: formData.act_information,
          act_explaination: formData.act_explaination
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="glass-panel w-full max-w-md rounded-3xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-2xl font-bold text-white mb-6">Add Top-Up (Modal)</h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-200 text-sm p-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <label className="block text-sm font-medium text-gray-300 mb-1 ml-1">Amount (Kredit)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">Rp</span>
              <input
                type="number"
                required
                min="0"
                value={formData.kredit}
                onChange={e => setFormData({ ...formData, kredit: e.target.value })}
                className="w-full glass-input rounded-xl py-2.5 pl-12 pr-4 focus:ring-2 focus:ring-brand-500"
                placeholder="10000000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1 ml-1">Information / Title</label>
            <input
              type="text"
              required
              value={formData.act_information}
              onChange={e => setFormData({ ...formData, act_information: e.target.value })}
              className="w-full glass-input rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-brand-500"
              placeholder="Inject modal dari Investor A"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1 ml-1">Explanation (Optional)</label>
            <textarea
              value={formData.act_explaination}
              onChange={e => setFormData({ ...formData, act_explaination: e.target.value })}
              className="w-full glass-input rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-brand-500 min-h-[80px]"
              placeholder="Catatan tambahan..."
            />
          </div>

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
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
