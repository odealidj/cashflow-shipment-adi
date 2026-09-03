"use client";

import { useEffect, useState } from "react";
import { 
  Building2, 
  Plus, 
  Mail, 
  Phone, 
  Calendar, 
  Edit, 
  Trash2, 
  Search, 
  RotateCcw, 
  AlertTriangle,
  User,
  MapPin,
  FileText,
  Building,
  CheckCircle2,
  Users
} from "lucide-react";
import { CustomerModal, Customer } from "@/components/CustomerModal";
import { fetchWithAuth } from "@/lib/apiClient";
import { tableTheadClass, ActionButton } from "@/components/shared/TableCard";
import { TablePagination } from "@/components/shared/TablePagination";
import { KpiCardGrid } from "@/components/shared/KpiCardGrid";
import { KpiCard } from "@/components/shared/KpiCard";

export function CustomerTable() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);

  // Reset to page 1 on search change
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Delete Confirmation State
  const [deleteCandidate, setDeleteCandidate] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm.trim())}` : "";
      const res = await fetchWithAuth(`http://localhost:8080/api/v1/customers?page=${page}&limit=${pageSize}${searchParam}`);
      const data = await res.json();
      if (data.status && data.data) {
        setCustomers(Array.isArray(data.data) ? data.data : (data.data.entries || []));
        setTotal(data.meta?.total_items ?? data.data?.total ?? 0);
      } else {
        setCustomers([]);
        setTotal(0);
      }
    } catch (err) {
      console.error("Failed to fetch customers", err);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, pageSize, searchTerm]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit", month: "short", year: "numeric"
    });
  };

  const handleOpenCreate = () => {
    setSelectedCustomer(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const handleConfirmSoftDelete = async () => {
    if (!deleteCandidate || !deleteCandidate.id) return;

    setIsDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8080/api/v1/customers/${deleteCandidate.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: text || `HTTP Error ${res.status}` };
      }

      if (!res.ok) {
        throw new Error(data.message || "Gagal menghapus customer");
      }

      setDeleteCandidate(null);
      fetchCustomers();
    } catch (err: any) {
      alert(err.message || "Gagal melakukan soft delete customer");
    } finally {
      setIsDeleting(false);
    }
  };

  const safeCustomers = Array.isArray(customers) ? customers : [];
  const filteredCustomers = safeCustomers.filter(c => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    const nameMatch = (c.name || "").toLowerCase().includes(term);
    const picMatch = (c.pic_name || "").toLowerCase().includes(term);
    const phoneMatch = (c.phone || "").toLowerCase().includes(term);
    const emailMatch = (c.email || "").toLowerCase().includes(term);
    const addressMatch = (c.address || "").toLowerCase().includes(term);
    const notesMatch = (c.notes || "").toLowerCase().includes(term);
    return nameMatch || picMatch || phoneMatch || emailMatch || addressMatch || notesMatch;
  });

  // Kalkulasi Ringkasan Cepat
  const totalPicCount = safeCustomers.filter(c => Boolean(c.pic_name && c.pic_name.trim())).length;
  const totalPhoneCount = safeCustomers.filter(c => Boolean(c.phone && c.phone.trim())).length;
  const totalAddressCount = safeCustomers.filter(c => Boolean(c.address && c.address.trim())).length;

  return (
    <>
      <div className="space-y-4">
        {/* KPI Strip Ringkasan Customer */}
        <KpiCardGrid cols={4}>
          <KpiCard
            title="Total Customer Klien"
            value={`${total || safeCustomers.length} Klien`}
            subtitle="Perusahaan pemilik muatan aktif"
            icon={<Building2 className="w-5 h-5" />}
            variant="sky"
          />
          <KpiCard
            title="Kontak PIC Terdata"
            value={`${totalPicCount} PIC`}
            subtitle="Person-in-Charge operasional"
            icon={<User className="w-5 h-5" />}
            variant="success"
          />
          <KpiCard
            title="Nomor Kontak / WA"
            value={`${totalPhoneCount} Kontak`}
            subtitle="Dapat dihubungi langsung"
            icon={<Phone className="w-5 h-5" />}
            variant="teal"
          />
          <KpiCard
            title="Alamat Pengiriman"
            value={`${totalAddressCount} Lokasi`}
            subtitle="Lokasi pabrik / kantor terdata"
            icon={<MapPin className="w-5 h-5" />}
            variant="default"
          />
        </KpiCardGrid>

        {/* Container Tabel Utama */}
        <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs">
          {/* Top Actions Bar */}
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4 bg-slate-50/50">
            <div>
              <h1 className="text-xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
                <Building2 className="w-5 h-5 text-sky-700" />
                <span>Daftar Master Customer & Perusahaan Klien</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Kelola data perusahaan pelanggan, kontak PIC, alamat penagihan, dan catatan terms pengiriman muatan
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleOpenCreate}
                className="text-xs bg-sky-700 hover:bg-sky-600 active:scale-95 text-white px-4 py-2 rounded-xl transition-all font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> Tambah Customer
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-4 pb-0">
            <div className="mb-3 bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[260px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama perusahaan, nama PIC, nomor HP/WA, email, alamat..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium placeholder:text-slate-400"
                />
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Pencarian</span>
                </button>
              )}
            </div>
          </div>
          
          {/* Customer Table Data */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className={tableTheadClass}>
                <tr>
                  <th className="px-6 py-3.5 w-12 text-center">No</th>
                  <th className="px-6 py-3.5 min-w-[220px]">Nama Perusahaan / Customer</th>
                  <th className="px-6 py-3.5 min-w-[180px]">Kontak PIC & Jabatan</th>
                  <th className="px-6 py-3.5 min-w-[200px]">Telepon & Email</th>
                  <th className="px-6 py-3.5 min-w-[240px]">Alamat Penagihan / Kantor</th>
                  <th className="px-6 py-3.5 min-w-[180px]">Catatan Khusus</th>
                  <th className="px-6 py-3.5 text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-700"></div>
                      <p className="mt-2 text-xs font-semibold">Memuat master data customer...</p>
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      {searchTerm ? "Tidak ada customer yang cocok dengan kata kunci pencarian." : "Belum ada customer terdaftar."}
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust: Customer, idx: number) => (
                    <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 text-center font-mono text-slate-400 font-bold">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-sky-100/70 text-sky-800 flex items-center justify-center text-xs font-black shrink-0 shadow-xs border border-sky-200/50">
                            {cust.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 text-xs sm:text-sm">{cust.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">ID Customer #{cust.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {cust.pic_name ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-900 font-bold">
                            <User className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                            <span>{cust.pic_name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {cust.phone ? (
                            <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
                              <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{cust.phone}</span>
                            </div>
                          ) : null}
                          {cust.email ? (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="truncate max-w-[180px]">{cust.email}</span>
                            </div>
                          ) : null}
                          {!cust.phone && !cust.email && (
                            <span className="text-slate-400 italic text-xs">Belum ada kontak</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        {cust.address ? (
                          <div className="flex items-start gap-1.5 text-xs text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{cust.address}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        {cust.notes ? (
                          <span className="text-slate-600 line-clamp-2 text-xs">{cust.notes}</span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <ActionButton
                            onClick={() => handleOpenEdit(cust)}
                            icon={<Edit className="w-3.5 h-3.5" />}
                            title="Edit Data Customer"
                            variant="amber"
                          />
                          <ActionButton
                            onClick={() => setDeleteCandidate(cust)}
                            icon={<Trash2 className="w-3.5 h-3.5" />}
                            title="Hapus Customer (Soft Delete)"
                            variant="rose"
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Pagination Terpadu */}
          <TablePagination
            currentPage={page}
            totalItems={total}
            pageSize={pageSize}
            currentCount={customers.length}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            itemUnit="customer"
          />
        </div>
      </div>

      {/* Customer Modal (Create / Edit) */}
      <CustomerModal
        isOpen={isModalOpen}
        customer={selectedCustomer}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchCustomers}
      />

      {/* Modal Konfirmasi Soft Delete */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 relative border border-slate-100 shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Hapus Data Customer?</h3>
                <p className="text-xs text-slate-500">Tindakan ini akan mengarsipkan data customer ini (Soft Delete)</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-6 bg-slate-50 p-3.5 rounded-xl border border-slate-100 leading-relaxed">
              Apakah Anda yakin ingin menghapus data customer <strong className="text-slate-900">{deleteCandidate.name}</strong>? Data riwayat invoice lama akan tetap tersimpan secara aman.
            </p>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSoftDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus Customer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
