"use client";

import { useEffect, useState } from "react";
import { Truck, Plus, Mail, Phone, Calendar } from "lucide-react";

export function VendorTable() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8080/api/v1/vendors?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status) {
        setVendors(data.data.entries || []);
        setTotal(data.data.total);
      }
    } catch (err) {
      console.error("Failed to fetch vendors", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [page]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit", month: "short", year: "numeric"
    });
  };

  return (
    <div className="glass-panel rounded-3xl overflow-hidden border border-white/5 animate-fade-in shadow-2xl mt-6">
      <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-white/5">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-brand-400" />
            Vendor Database
          </h3>
          <p className="text-sm text-gray-400 mt-1">Manage transport and service partners</p>
        </div>
        <div>
          <button 
            className="text-sm bg-gradient-to-r from-brand-600 to-purple-600 hover:opacity-90 text-white px-4 py-2 rounded-lg transition-all font-medium shadow-lg shadow-brand-500/30 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Vendor
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="text-xs uppercase bg-black/20 text-gray-400 sticky top-0">
            <tr>
              <th className="px-6 py-4 font-semibold">Vendor Name</th>
              <th className="px-6 py-4 font-semibold">Contact Info</th>
              <th className="px-6 py-4 font-semibold">Notes</th>
              <th className="px-6 py-4 font-semibold">Registered At</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                </td>
              </tr>
            ) : vendors.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                  No vendors found in the system.
                </td>
              </tr>
            ) : (
              vendors.map((vendor: any) => (
                <tr key={vendor.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{vendor.name}</div>
                    <div className="text-xs text-gray-500 mt-1">ID: #{vendor.id}</div>
                  </td>
                  <td className="px-6 py-4 space-y-1">
                    <div className="flex items-center gap-2 text-gray-300">
                      <Mail className="w-3.5 h-3.5 text-gray-500" />
                      {vendor.email || "-"}
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <Phone className="w-3.5 h-3.5 text-gray-500" />
                      {vendor.phone || "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-xs truncate">{vendor.notes || "-"}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                      {formatDate(vendor.created_at)}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Controls */}
      <div className="px-6 py-4 border-t border-white/10 flex justify-between items-center bg-black/10">
        <span className="text-sm text-gray-400">
          Showing <span className="font-medium text-white">{vendors.length}</span> of <span className="font-medium text-white">{total}</span> vendors
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
            disabled={vendors.length < 10}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 disabled:opacity-50 transition-colors text-sm"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
