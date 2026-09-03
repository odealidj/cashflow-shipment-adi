"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  Users, 
  UserPlus, 
  Shield, 
  KeyRound, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  Clock,
  Briefcase,
  UserCheck,
  Building,
  Crown
} from "lucide-react";
import { API_BASE_URL, fetchWithAuth } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import { TablePagination } from "@/components/shared/TablePagination";
import { UserModal, UserItem } from "@/components/users/UserModal";
import { ResetPasswordModal } from "@/components/users/ResetPasswordModal";
import { DeleteUserModal } from "@/components/users/DeleteUserModal";

interface UserResponse {
  id: string;
  email: string;
  phone?: string;
  full_name: string;
  role: string;
  status: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export default function UsersManagementPage() {
  const { user: currentUser, isSuperAdmin } = useAuth();

  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter & Pagination State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [total, setTotal] = useState(0);

  // Modal States
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserItem | null>(null);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<UserItem | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<UserItem | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      if (selectedRole !== "ALL") params.set("role", selectedRole);
      if (selectedStatus !== "ALL") params.set("status", selectedStatus);

      const res = await fetchWithAuth(`${API_BASE_URL}/users?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Gagal memuat daftar pengguna");
      }

      setUsers(data.data?.users || []);
      setTotal(data.data?.meta?.total || 0);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, selectedRole, selectedStatus]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // KPI Calculations
  const totalUsers = total;
  const pendingCount = users.filter((u) => u.status === "INACTIVE").length;
  const adminCount = users.filter((u) => u.role === "admin" || u.role === "super_admin").length;
  const financeCount = users.filter((u) => u.role === "finance" || u.role === "operator").length;

  const handleOpenAdd = () => {
    setSelectedUserForEdit(null);
    setIsUserModalOpen(true);
  };

  const handleOpenEdit = (u: UserResponse) => {
    setSelectedUserForEdit({
      id: u.id,
      email: u.email,
      phone: u.phone,
      full_name: u.full_name,
      role: u.role,
      status: u.status,
    });
    setIsUserModalOpen(true);
  };

  const handleOpenReset = (u: UserResponse) => {
    setSelectedUserForReset({
      id: u.id,
      email: u.email,
      phone: u.phone,
      full_name: u.full_name,
      role: u.role,
      status: u.status,
    });
    setIsResetModalOpen(true);
  };

  const handleOpenDelete = (u: UserResponse) => {
    setSelectedUserForDelete({
      id: u.id,
      email: u.email,
      phone: u.phone,
      full_name: u.full_name,
      role: u.role,
      status: u.status,
    });
    setIsDeleteModalOpen(true);
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "Belum pernah";
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch (_) {
      return dateStr;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "super_admin":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
            <Crown className="w-3 h-3 text-purple-600" />
            IT Super Admin
          </span>
        );
      case "admin":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-sky-50 text-sky-800 border border-sky-200">
            <Shield className="w-3 h-3 text-sky-600" />
            Admin Bisnis
          </span>
        );
      case "finance":
      case "operator":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-teal-50 text-teal-700 border border-teal-200">
            <Briefcase className="w-3 h-3 text-teal-600" />
            Finance & Akuntansi
          </span>
        );
      case "direktur":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <UserCheck className="w-3 h-3 text-indigo-600" />
            Direktur
          </span>
        );
      case "owner":
      case "viewer":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
            <Building className="w-3 h-3 text-amber-600" />
            Pemilik Modal
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#223249] tracking-tight">
                Manajemen Pengguna & Hak Akses
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Kelola akun pengguna, persetujuan pendaftaran, peran otorisasi, dan status sistem
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#223249] to-sky-900 hover:from-slate-900 hover:to-sky-950 text-white text-xs font-bold shadow-md shadow-slate-900/20 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Pengguna</span>
        </button>
      </div>

      {/* KPI Cards Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Pengguna */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Pengguna
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#223249] mt-2">{totalUsers}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Akun terdaftar di sistem</p>
        </div>

        {/* Card 2: Menunggu Persetujuan (Pending Approval) */}
        <div className={`p-5 rounded-2xl border shadow-xs transition-all ${
          pendingCount > 0 
            ? "bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/30" 
            : "bg-white border-slate-200/80"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              pendingCount > 0 ? "text-amber-800 font-extrabold" : "text-slate-500"
            }`}>
              Menunggu Approval
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
              pendingCount > 0 
                ? "bg-amber-500 text-white border-amber-600 animate-pulse" 
                : "bg-amber-50 text-amber-600 border-amber-100"
            }`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl font-black mt-2 ${pendingCount > 0 ? "text-amber-900" : "text-slate-800"}`}>
            {pendingCount}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {pendingCount > 0 ? "Perlu verifikasi & aktivasi" : "Tidak ada antrean approval"}
          </p>
        </div>

        {/* Card 3: Admin Bisnis */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Admin Bisnis
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-sky-800 mt-2">{adminCount}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Otoritas operasional penuh</p>
        </div>

        {/* Card 4: Finance & Akuntansi */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Finance & Akuntansi
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-teal-800 mt-2">{financeCount}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Entri transaksi & invoice</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Cari nama pengguna, email, atau nomor HP..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Semua Peran</option>
              <option value="admin">Admin Bisnis</option>
              <option value="finance">Finance & Akuntansi</option>
              <option value="direktur">Direktur</option>
              <option value="owner">Pemilik Modal</option>
              {isSuperAdmin && <option value="super_admin">IT Super Admin</option>}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">🟢 Aktif</option>
              <option value="INACTIVE">🟡 Menunggu Approval</option>
              <option value="SUSPENDED">🔴 Ditangguhkan</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchUsers}
            title="Refresh Data"
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {/* Header Standardized: bg-[#EBF3FA] text-[#223249] border-sky-200/70 */}
              <tr className="bg-[#EBF3FA] text-[#223249] text-xs font-bold border-b border-sky-200/70 select-none">
                <th className="py-3 px-4 text-center w-12">No</th>
                <th className="py-3 px-4 min-w-[200px]">Pengguna</th>
                <th className="py-3 px-4 min-w-[180px]">Email & Kontak</th>
                <th className="py-3 px-4 min-w-[160px]">Peran (Role)</th>
                <th className="py-3 px-4 text-center min-w-[150px]">Status Akun</th>
                <th className="py-3 px-4 min-w-[160px]">Login Terakhir</th>
                <th className="py-3 px-4 text-center min-w-[140px]">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-sky-600" />
                      <span>Memuat data pengguna...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                      <span className="font-semibold">Tidak ada data pengguna yang sesuai</span>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((u, idx) => {
                  const isCurrentUser = currentUser?.user_id === u.id;
                  const isTargetSuperAdmin = u.role === "super_admin";
                  const isPending = u.status === "INACTIVE";

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-sky-50/40 transition-colors group ${
                        isPending ? "bg-amber-50/30" : ""
                      }`}
                    >
                      {/* No */}
                      <td className="py-3 px-4 text-center font-bold text-slate-400">
                        {(page - 1) * limit + idx + 1}
                      </td>

                      {/* Pengguna (Avatar + Nama) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#223249] to-sky-800 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                            {u.full_name?.charAt(0) || "U"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                              <span>{u.full_name}</span>
                              {isCurrentUser && (
                                <span className="px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-700 text-[9px] font-extrabold">
                                  Anda
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-400">ID: {u.id.substring(0, 8)}...</p>
                          </div>
                        </div>
                      </td>

                      {/* Kontak & Email */}
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-800">{u.email}</p>
                        <p className="text-[11px] text-slate-500">{u.phone || "-"}</p>
                      </td>

                      {/* Peran */}
                      <td className="py-3 px-4">{getRoleBadge(u.role)}</td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {u.status === "ACTIVE" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Aktif
                          </span>
                        ) : u.status === "INACTIVE" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-800 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Menunggu Approval
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            Ditangguhkan
                          </span>
                        )}
                      </td>

                      {/* Terakhir Login */}
                      <td className="py-3 px-4 text-slate-600">
                        {formatDateTime(u.last_login_at)}
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Quick Approve Button if Inactive */}
                          {isPending && (
                            <button
                              onClick={() => handleOpenEdit(u)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-all cursor-pointer mr-1"
                              title="Setujui & Aktivasi Akun Pengguna"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Aktivasi</span>
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEdit(u)}
                            disabled={isTargetSuperAdmin && !isSuperAdmin}
                            title="Edit Pengguna"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-700 hover:bg-sky-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => handleOpenReset(u)}
                            disabled={isTargetSuperAdmin && !isSuperAdmin}
                            title="Reset Password"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Delete / Deactivate */}
                          <button
                            onClick={() => handleOpenDelete(u)}
                            disabled={isCurrentUser || (isTargetSuperAdmin && !isSuperAdmin)}
                            title={isCurrentUser ? "Tidak dapat menghapus akun sendiri" : "Nonaktifkan / Hapus Pengguna"}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Unified TablePagination Component */}
        <TablePagination
          currentPage={page}
          pageSize={limit}
          totalItems={total}
          currentCount={users.length}
          onPageChange={setPage}
          onPageSizeChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
          pageSizeOptions={[10, 15, 25, 50]}
        />
      </div>

      {/* MODALS */}
      {isUserModalOpen && (
        <UserModal
          isOpen={isUserModalOpen}
          onClose={() => setIsUserModalOpen(false)}
          onSuccess={fetchUsers}
          editUser={selectedUserForEdit}
          isSuperAdmin={isSuperAdmin}
        />
      )}

      {isResetModalOpen && selectedUserForReset && (
        <ResetPasswordModal
          isOpen={isResetModalOpen}
          onClose={() => {
            setIsResetModalOpen(false);
            setSelectedUserForReset(null);
          }}
          onSuccess={fetchUsers}
          user={selectedUserForReset}
        />
      )}

      {isDeleteModalOpen && selectedUserForDelete && (
        <DeleteUserModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedUserForDelete(null);
          }}
          onSuccess={fetchUsers}
          user={selectedUserForDelete}
        />
      )}
    </div>
  );
}
