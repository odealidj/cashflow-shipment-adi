"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  KeyRound, 
  Check, 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  Users, 
  Save, 
  CheckSquare, 
  Square, 
  Info,
  AlertTriangle,
  Lock,
  Sparkles,
  ArrowRight,
  Layers,
  ChevronRight,
  RotateCcw
} from "lucide-react";
import { fetchWithAuth, API_BASE_URL } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";

interface RoleItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_system: boolean;
  user_count: number;
  created_at: string;
}

interface PermissionItem {
  id: string;
  module: string;
  code: string;
  name: string;
  description?: string;
}

interface PermissionGroup {
  module: string;
  permissions: PermissionItem[];
}

export default function RolesManagementPage() {
  const { user: currentUser, isSuperAdmin, can } = useAuth();

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [initialPermissions, setInitialPermissions] = useState<string[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [matrixLoading, setMatrixLoading] = useState<boolean>(false);
  const [savingPermissions, setSavingPermissions] = useState<boolean>(false);
  
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRoleCode, setNewRoleCode] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [submittingRole, setSubmittingRole] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editRoleName, setEditRoleName] = useState("");
  const [editRoleDesc, setEditRoleDesc] = useState("");

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleItem | null>(null);
  const [deletingRole, setDeletingRole] = useState(false);

  // 1. Fetch all roles and permission dictionary
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetchWithAuth(`${API_BASE_URL}/roles`),
        fetchWithAuth(`${API_BASE_URL}/roles/permissions`),
      ]);

      const rolesData = await rolesRes.json();
      const permsData = await permsRes.json();

      if (rolesRes.ok && rolesData.data) {
        setRoles(rolesData.data);
        if (rolesData.data.length > 0 && !selectedRole) {
          // Default select first editable role (or admin)
          const defaultRole = rolesData.data.find((r: RoleItem) => r.code === "admin") || rolesData.data[0];
          setSelectedRole(defaultRole);
        }
      }

      if (permsRes.ok && permsData.data) {
        setPermissionGroups(permsData.data);
      }
    } catch (err: any) {
      setMessage({ text: "Gagal memuat data peran: " + err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }, [selectedRole]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 2. Fetch permissions when selected role changes
  const fetchRolePermissions = useCallback(async (roleId: string) => {
    setMatrixLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/roles/${roleId}`);
      const data = await res.json();
      if (res.ok && data.data) {
        const perms = data.data.permissions || [];
        setSelectedPermissions(perms);
        setInitialPermissions(perms);
      }
    } catch (err: any) {
      setMessage({ text: "Gagal memuat izin role: " + err.message, type: "error" });
    } finally {
      setMatrixLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedRole) {
      fetchRolePermissions(selectedRole.id);
    }
  }, [selectedRole, fetchRolePermissions]);

  // Handle permission toggle
  const togglePermission = (code: string) => {
    if (!can("roles.manage")) return;
    if (selectedRole?.code === "super_admin") return; // Super admin locked

    setSelectedPermissions((prev) => 
      prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code]
    );
  };

  // Toggle all permissions for a specific module
  const toggleModulePermissions = (moduleName: string) => {
    if (!can("roles.manage")) return;
    if (selectedRole?.code === "super_admin") return;

    const group = permissionGroups.find((g) => g.module === moduleName);
    if (!group) return;

    const groupCodes = group.permissions.map((p) => p.code);
    const allSelected = groupCodes.every((c) => selectedPermissions.includes(c));

    if (allSelected) {
      // Uncheck all in this module
      setSelectedPermissions((prev) => prev.filter((c) => !groupCodes.includes(c)));
    } else {
      // Check all in this module
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...groupCodes])));
    }
  };

  // Select all permissions across system
  const handleSelectAll = () => {
    if (!can("roles.manage")) return;
    if (selectedRole?.code === "super_admin") return;

    const allCodes = permissionGroups.flatMap((g) => g.permissions.map((p) => p.code));
    setSelectedPermissions(allCodes);
  };

  // Deselect all
  const handleDeselectAll = () => {
    if (!can("roles.manage")) return;
    if (selectedRole?.code === "super_admin") return;

    setSelectedPermissions([]);
  };

  // Save permission matrix
  const handleSavePermissions = async () => {
    if (!selectedRole || !can("roles.manage")) return;
    setSavingPermissions(true);
    setMessage(null);

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/roles/${selectedRole.id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: selectedPermissions }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Gagal menyimpan matriks hak akses");
      }

      setInitialPermissions(selectedPermissions);
      setMessage({ text: `Hak akses untuk peran ${selectedRole.name} berhasil disimpan dan disinkronkan secara real-time!`, type: "success" });
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      setMessage({ text: err.message || "Terjadi kesalahan saat menyimpan", type: "error" });
    } finally {
      setSavingPermissions(false);
    }
  };

  // Create new role
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleCode || !newRoleName) return;
    setSubmittingRole(true);

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newRoleCode.trim().toLowerCase().replace(/\s+/g, "_"),
          name: newRoleName.trim(),
          description: newRoleDesc.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Gagal membuat peran baru");
      }

      setIsAddModalOpen(false);
      setNewRoleCode("");
      setNewRoleName("");
      setNewRoleDesc("");
      setMessage({ text: `Peran '${newRoleName}' berhasil dibuat! Silakan atur izinnya pada matriks hak akses.`, type: "success" });
      
      // Refresh roles and select newly created role
      await fetchData();
      if (data.data) {
        setSelectedRole(data.data);
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setSubmittingRole(false);
    }
  };

  // Edit role info
  const handleOpenEdit = (role: RoleItem) => {
    setEditRoleName(role.name);
    setEditRoleDesc(role.description || "");
    setIsEditModalOpen(true);
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !editRoleName) return;
    setSubmittingRole(true);

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/roles/${selectedRole.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editRoleName.trim(),
          description: editRoleDesc.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Gagal memperbarui informasi peran");
      }

      setIsEditModalOpen(false);
      setMessage({ text: "Informasi peran berhasil diperbarui!", type: "success" });
      fetchData();
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setSubmittingRole(false);
    }
  };

  // Delete role
  const handleOpenDelete = (role: RoleItem) => {
    setRoleToDelete(role);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!roleToDelete) return;
    setDeletingRole(true);

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/roles/${roleToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Gagal menghapus peran");
      }

      setIsDeleteModalOpen(false);
      setRoleToDelete(null);
      setMessage({ text: `Peran '${roleToDelete.name}' berhasil dihapus.`, type: "success" });
      
      // Reselect admin or first role
      setSelectedRole(null);
      fetchData();
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setDeletingRole(false);
    }
  };

  const hasUnsavedChanges = 
    JSON.stringify([...selectedPermissions].sort()) !== 
    JSON.stringify([...initialPermissions].sort());

  // Master Standar Izin Bawaan Sistem (Factory Default Roles)
  const SYSTEM_DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
    admin: [
      "cashflow.view", "cashflow.create", "cashflow.edit", "cashflow.delete", "cashflow.export", "cashflow.import",
      "invoices.view", "invoices.create", "invoices.edit", "invoices.delete", "invoices.mark_paid", "invoices.print",
      "customers.view", "customers.manage",
      "vendors.view", "vendors.manage",
      "presets.view", "presets.manage",
      "users.view", "users.create", "users.edit", "users.delete", "users.reset_password",
      "roles.view", "roles.manage"
    ],
    finance: [
      "cashflow.view", "cashflow.create", "cashflow.edit", "cashflow.export", "cashflow.import",
      "invoices.view", "invoices.create", "invoices.edit", "invoices.mark_paid", "invoices.print",
      "customers.view", "vendors.view", "presets.view"
    ],
    direktur: [
      "cashflow.view", "cashflow.export",
      "invoices.view", "invoices.print",
      "customers.view", "vendors.view", "presets.view",
      "users.view", "users.edit", "users.delete", "users.reset_password",
      "roles.view"
    ],
    owner: [
      "cashflow.view", "cashflow.export",
      "invoices.view", "invoices.print",
      "customers.view", "vendors.view", "presets.view",
      "users.view", "users.edit", "users.delete", "users.reset_password",
      "roles.view"
    ]
  };

  // Solusi 1: Batalkan perubahan dan kembalikan ke kondisi semula
  const handleDiscardChanges = () => {
    setSelectedPermissions([...initialPermissions]);
    setMessage({ 
      text: "Perubahan wewenang dibatalkan. Kembali ke kondisi tersimpan.", 
      type: "success" 
    });
    setTimeout(() => setMessage(null), 4000);
  };

  // Solusi Tambahan: Setel kembali ke standar bawaan sistem
  const handleResetToSystemDefault = () => {
    if (!selectedRole || !SYSTEM_DEFAULT_ROLE_PERMISSIONS[selectedRole.code]) return;
    const defaults = SYSTEM_DEFAULT_ROLE_PERMISSIONS[selectedRole.code];
    setSelectedPermissions([...defaults]);
    setMessage({ 
      text: `Daftar hak akses peran '${selectedRole.name}' telah disesuaikan dengan rekomendasi standar sistem. Klik 'Simpan Perubahan' untuk menerapkan secara permanen.`, 
      type: "success" 
    });
  };

  // Solusi 2: Hitung diff penambahan dan pencabutan izin
  const addedPermissionsCount = selectedPermissions.filter(c => !initialPermissions.includes(c)).length;
  const removedPermissionsCount = initialPermissions.filter(c => !selectedPermissions.includes(c)).length;

  const getModuleLabel = (moduleName: string) => {
    switch (moduleName) {
      case "CASHFLOW": return "Kas & Operasional (Cashflow)";
      case "INVOICES": return "Monitoring Invoice & Piutang";
      case "CUSTOMERS": return "Master Klien (Customers)";
      case "VENDORS": return "Master Vendor Armada";
      case "PRESETS": return "Preset Aktivitas & Rute";
      case "USERS": return "Manajemen Pengguna & Staf";
      case "ROLES": return "Manajemen Peran & Wewenang";
      default: return moduleName;
    }
  };

  return (
    <div className="min-h-[calc(100vh-7.5rem)] flex flex-col gap-4 pb-4">
      {/* 1. Header Section */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-700 border border-sky-100 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#223249] tracking-tight">
                Manajemen Peran & Hak Akses (PBAC)
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Atur jabatan pengguna dan sesuaikan matriks hak akses tombol/fitur secara dinamis
              </p>
            </div>
          </div>
        </div>

        {can("roles.manage") && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#223249] to-sky-900 hover:from-slate-900 hover:to-sky-950 text-white text-xs font-bold shadow-md shadow-slate-900/20 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Peran Baru</span>
          </button>
        )}
      </div>

      {/* Global Alert Notification */}
      {message && (
        <div className={`shrink-0 p-4 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 shadow-xs animate-fade-in ${
          message.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
            : "bg-rose-50 text-rose-800 border border-rose-200"
        }`}>
          <div className="flex items-center gap-2.5">
            {message.type === "success" ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="p-1 hover:bg-black/5 rounded-lg cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Main Two-Column Layout (Fills remaining height proportionally) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
        
        {/* LEFT COLUMN: Daftar Peran (4 Cols on lg, 3.5 Cols on xl) */}
        <div className="lg:col-span-4 xl:col-span-3.5 flex flex-col h-full">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Daftar Jabatan ({roles.length})
                </h2>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Pilih untuk kelola
              </span>
            </div>

            <div className="space-y-2.5 flex-1 overflow-y-auto pr-1 soft-scrollbar relative min-h-0">
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400">Memuat peran...</div>
              ) : roles.map((role) => {
                const isSelected = selectedRole?.id === role.id;
                const isSystem = role.is_system;
                const isRoot = role.code === "super_admin";

                return (
                  <div
                    key={role.id}
                    onClick={() => {
                      if (hasUnsavedChanges && selectedRole?.id !== role.id) {
                        if (!confirm(`Perubahan hak akses pada peran '${selectedRole?.name}' belum disimpan. Apakah Anda yakin ingin membatalkan dan berganti peran?`)) {
                          return;
                        }
                      }
                      setSelectedRole(role);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                      isSelected 
                        ? "bg-gradient-to-r from-sky-50/90 to-blue-50/50 border-sky-300 shadow-sm ring-2 ring-sky-500/20" 
                        : "bg-white hover:bg-slate-50/80 border-slate-200/80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className={`text-sm font-bold truncate ${isSelected ? "text-sky-950" : "text-slate-800"}`}>
                            {role.name}
                          </h3>
                          {isRoot ? (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wider shrink-0">
                              IT Root
                            </span>
                          ) : isSystem ? (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-sky-100 text-sky-800 border border-sky-200 uppercase tracking-wider shrink-0">
                              Sistem
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider shrink-0">
                              Kustom
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-1">
                          {role.description || "Tidak ada deskripsi"}
                        </p>

                        <div className="flex items-center gap-3 mt-2.5 text-[11px] text-slate-600 font-medium">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-400" />
                            <b className="text-slate-800">{role.user_count}</b> Pengguna
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono text-[10px] text-slate-400 font-bold uppercase">
                            {role.code}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1">
                        {isSelected && (
                          <ChevronRight className="w-4 h-4 text-sky-600" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Matriks Hak Akses (8 Cols on lg, 8.5 Cols on xl) */}
        <div className="lg:col-span-8 xl:col-span-8.5 flex flex-col h-full">
          {selectedRole ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex-1 flex flex-col min-h-0">
              
              {/* Header Kartu Matriks (Fixed Top inside Card) */}
              <div className="p-5 px-6 border-b border-slate-100 bg-slate-50/70 shrink-0 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-sky-700 uppercase tracking-wider">
                      Matriks Hak Akses Tombol & Fitur
                    </span>
                    {selectedRole.code === "super_admin" ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                        🔒 Kebal Mutlak (Bypass All)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-200">
                        🔓 100% Dinamis
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-black text-[#223249] mt-0.5">
                    {selectedRole.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedRole.description || "Atur hak akses granular per aksi di bawah ini"}
                  </p>
                </div>

                {/* Header Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Edit Role Info (jika bukan super admin) */}
                  {selectedRole.code !== "super_admin" && can("roles.manage") && (
                    <button
                      onClick={() => handleOpenEdit(selectedRole)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                      title="Edit Nama / Deskripsi Peran"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Edit Info</span>
                    </button>
                  )}

                  {/* Delete Role (hanya jika bukan system dan 0 user) */}
                  {!selectedRole.is_system && can("roles.manage") && (
                    <button
                      onClick={() => handleOpenDelete(selectedRole)}
                      disabled={selectedRole.user_count > 0}
                      title={selectedRole.user_count > 0 ? "Peran masih digunakan oleh pengguna" : "Hapus Peran"}
                      className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  )}

                  {/* Batalkan Perubahan Button (Solusi 1) */}
                  {selectedRole.code !== "super_admin" && hasUnsavedChanges && can("roles.manage") && (
                    <button
                      onClick={handleDiscardChanges}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                      title="Batalkan perubahan dan kembalikan ke kondisi tersimpan"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Batalkan</span>
                    </button>
                  )}

                  {/* Simpan Perubahan Button */}
                  {selectedRole.code !== "super_admin" && can("roles.manage") && (
                    <button
                      onClick={handleSavePermissions}
                      disabled={savingPermissions || !hasUnsavedChanges}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95 ${
                        hasUnsavedChanges
                          ? "bg-sky-700 hover:bg-sky-800 text-white animate-pulse"
                          : "bg-slate-100 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingPermissions ? "Menyimpan..." : "Simpan Perubahan"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Notice Banner jika Super Admin */}
              {selectedRole.code === "super_admin" && (
                <div className="m-5 mb-0 p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900 flex items-start gap-3 shrink-0">
                  <Lock className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold">Role IT Super Admin Kebal Mutlak (*Fail-Safe Root*)</h4>
                    <p className="mt-0.5 text-purple-700 leading-relaxed">
                      Sesuai standar keamanan sistem korporat, role Super Admin IT selalu memiliki hak akses penuh ke seluruh fitur dan tombol sistem secara otomatis (<code className="bg-purple-200/60 px-1 py-0.5 rounded font-mono font-bold">*</code>). Hal ini untuk memastikan sistem memiliki jaring pengaman darurat jika konfigurasi peran bisnis terkunci.
                    </p>
                  </div>
                </div>
              )}

              {/* Quick Select All & Reset to Default Toolbar */}
              {selectedRole.code !== "super_admin" && can("roles.manage") && (
                <div className="px-6 py-2.5 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSelectAll}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition shadow-2xs flex items-center gap-1 cursor-pointer"
                      title="Centang semua hak akses pada semua modul"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-sky-600" />
                      <span>Pilih Semua</span>
                    </button>
                    <button
                      onClick={handleDeselectAll}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition shadow-2xs flex items-center gap-1 cursor-pointer"
                      title="Hapus semua centang hak akses"
                    >
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                      <span>Kosongkan</span>
                    </button>

                    {/* Tombol Standar Sistem (Khusus Role Bawaan Sistem) */}
                    {SYSTEM_DEFAULT_ROLE_PERMISSIONS[selectedRole.code] && (
                      <button
                        onClick={handleResetToSystemDefault}
                        className="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 font-bold hover:bg-sky-100 transition shadow-2xs flex items-center gap-1 cursor-pointer"
                        title="Setel daftar hak akses sesuai rekomendasi standar bawaan sistem"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-sky-700" />
                        <span>Standar Sistem</span>
                      </button>
                    )}
                  </div>

                  {/* Ringkasan Status & Perubahan Diff */}
                  <div className="flex items-center gap-3">
                    {hasUnsavedChanges && (
                      <div className="flex items-center gap-1.5 text-[11px] font-bold">
                        {addedPermissionsCount > 0 && (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            +{addedPermissionsCount} baru
                          </span>
                        )}
                        {removedPermissionsCount > 0 && (
                          <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            -{removedPermissionsCount} dicabut
                          </span>
                        )}
                      </div>
                    )}
                    <span className="text-[11px] font-bold text-slate-500">
                      <b className="text-sky-700 font-black">{selectedPermissions.length}</b> izin aktif dipilih
                    </span>
                  </div>
                </div>
              )}

              {/* Permissions Checklist Grouped by Modules (Scrollable Internal Area) */}
              <div className="p-6 space-y-5 flex-1 overflow-y-auto soft-scrollbar relative min-h-0">
                {matrixLoading ? (
                  <div className="py-16 text-center text-xs text-slate-400">
                    Memuat matriks wewenang...
                  </div>
                ) : (
                  permissionGroups.map((group) => {
                    const groupCodes = group.permissions.map((p) => p.code);
                    const allInGroupSelected = groupCodes.every((c) => selectedPermissions.includes(c));
                    const someInGroupSelected = groupCodes.some((c) => selectedPermissions.includes(c));

                    return (
                      <div 
                        key={group.module}
                        className="rounded-2xl border border-slate-200/80 overflow-hidden bg-white shadow-2xs"
                      >
                        {/* Module Header Bar with Group Toggle */}
                        <div className="px-4 py-3 bg-[#EBF3FA] border-b border-sky-200/70 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-sky-800" />
                            <h3 className="text-xs font-black text-[#223249] tracking-tight uppercase">
                              {getModuleLabel(group.module)}
                            </h3>
                            <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded-md">
                              {group.permissions.length} Aksi
                            </span>
                          </div>

                          {selectedRole.code !== "super_admin" && can("roles.manage") && (
                            <button
                              onClick={() => toggleModulePermissions(group.module)}
                              className="text-[11px] font-bold text-sky-800 hover:text-sky-950 px-2 py-0.5 rounded hover:bg-sky-100/70 transition cursor-pointer"
                            >
                              {allInGroupSelected ? "Batalkan Modul Ini" : "Pilih Semua di Modul Ini"}
                            </button>
                          )}
                        </div>

                        {/* Permissions Grid in Module */}
                        <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2.5 bg-slate-50/30">
                          {group.permissions.map((perm) => {
                            const wasInitiallyChecked = initialPermissions.includes(perm.code);
                            const isChecked = selectedRole.code === "super_admin" || selectedPermissions.includes(perm.code);
                            const isSuperAdminRole = selectedRole.code === "super_admin";

                            // Solusi 2: Deteksi perubahan izin secara visual
                            const isNewlyAdded = !isSuperAdminRole && isChecked && !wasInitiallyChecked;
                            const isNewlyRemoved = !isSuperAdminRole && !isChecked && wasInitiallyChecked;

                            return (
                              <label
                                key={perm.id}
                                onClick={() => !isSuperAdminRole && togglePermission(perm.code)}
                                className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                                  isSuperAdminRole
                                    ? "bg-purple-50/50 border-purple-200 opacity-90 cursor-default"
                                    : isNewlyAdded
                                    ? "bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20 text-emerald-950 cursor-pointer shadow-xs"
                                    : isNewlyRemoved
                                    ? "bg-amber-50/60 border-dashed border-amber-300 ring-2 ring-amber-500/20 text-amber-950 cursor-pointer shadow-xs"
                                    : isChecked
                                    ? "bg-sky-50/80 border-sky-200 text-sky-950 cursor-pointer shadow-2xs"
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                                }`}
                              >
                                <div className="pt-0.5">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={isSuperAdminRole || !can("roles.manage")}
                                    onChange={() => {}} // handled by parent label click
                                    className={`w-4 h-4 rounded cursor-pointer ${
                                      isNewlyAdded
                                        ? "text-emerald-600 focus:ring-emerald-500 border-emerald-400"
                                        : isNewlyRemoved
                                        ? "text-amber-600 focus:ring-amber-500 border-amber-400"
                                        : "text-sky-600 focus:ring-sky-500 border-slate-300"
                                    }`}
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className={`text-xs font-bold ${
                                      isNewlyAdded 
                                        ? "text-emerald-950" 
                                        : isNewlyRemoved 
                                        ? "text-amber-950 line-through opacity-80" 
                                        : isChecked 
                                        ? "text-sky-900" 
                                        : "text-slate-800"
                                    }`}>
                                      {perm.name}
                                    </p>
                                    
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {/* Solusi 2: Badge Penanda Visual Perubahan */}
                                      {isNewlyAdded && (
                                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-2xs">
                                          + Ditambahkan
                                        </span>
                                      )}
                                      {isNewlyRemoved && (
                                        <span className="text-[9px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-2xs">
                                          - Dicabut
                                        </span>
                                      )}
                                      <span className="text-[9px] font-mono font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                        {perm.code}
                                      </span>
                                    </div>
                                  </div>
                                  <p className={`text-[11px] mt-0.5 leading-normal ${
                                    isNewlyAdded ? "text-emerald-700" : isNewlyRemoved ? "text-amber-700" : "text-slate-500"
                                  }`}>
                                    {perm.description || "Akses izin untuk fitur terkait"}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Sticky Bottom Bar if Unsaved Changes (Solusi 1 & 2) */}
              {hasUnsavedChanges && (
                <div className="p-3 px-6 bg-[#1A283C] text-white flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xl border-t border-slate-700/80 animate-fade-in">
                  <div className="flex items-center gap-2.5 text-xs">
                    <Sparkles className="w-4 h-4 text-sky-300 animate-spin" />
                    <span>
                      Ada perubahan yang belum disimpan:{" "}
                      {addedPermissionsCount > 0 && (
                        <b className="text-emerald-300 mr-1.5">+{addedPermissionsCount} Ditambahkan</b>
                      )}
                      {removedPermissionsCount > 0 && (
                        <b className="text-amber-300">-{removedPermissionsCount} Dicabut</b>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDiscardChanges}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-600 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Batalkan perubahan dan kembalikan ke kondisi tersimpan"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Batalkan</span>
                    </button>
                    <button
                      onClick={handleSavePermissions}
                      disabled={savingPermissions}
                      className="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-sky-950 text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingPermissions ? "Menyimpan..." : "Simpan Perubahan Sekarang"}</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 border border-slate-200/80 shadow-xs text-center text-slate-400 min-h-[480px] flex-1 flex flex-col items-center justify-center">
              <Shield className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm font-bold">Pilih salah satu peran di sebelah kiri untuk melihat matriks hak aksesnya.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Tambah Peran Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden my-auto">
            <div className="bg-gradient-to-r from-[#223249] to-[#1a2638] text-white p-5 px-6 flex items-center justify-between border-b border-sky-900/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-sky-300">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Tambah Peran Baru</h2>
                  <p className="text-xs text-sky-200">Buat peran kustom untuk wewenang tim</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Jabatan / Peran *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Supervisor Lapangan"
                  value={newRoleName}
                  onChange={(e) => {
                    setNewRoleName(e.target.value);
                    if (!newRoleCode) {
                      setNewRoleCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "_"));
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kode Peran (Identifier Unik) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="contoh: spv_lapangan"
                  value={newRoleCode}
                  onChange={(e) => setNewRoleCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-sky-500 outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">Hanya huruf kecil, angka, dan garis bawah (_)</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi Tanggung Jawab
                </label>
                <textarea
                  rows={3}
                  placeholder="Uraian singkat wewenang dan tugas jabatan ini..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingRole}
                  className="px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {submittingRole ? "Menyimpan..." : "Buat Peran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Info Peran */}
      {isEditModalOpen && selectedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden my-auto">
            <div className="bg-gradient-to-r from-[#223249] to-[#1a2638] text-white p-5 px-6 flex items-center justify-between border-b border-sky-900/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-sky-300">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Edit Info Peran</h2>
                  <p className="text-xs text-sky-200">Perbarui nama atau deskripsi peran</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateRole} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Jabatan / Peran *
                </label>
                <input
                  type="text"
                  required
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi Tanggung Jawab
                </label>
                <textarea
                  rows={3}
                  value={editRoleDesc}
                  onChange={(e) => setEditRoleDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingRole}
                  className="px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {submittingRole ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Hapus Peran */}
      {isDeleteModalOpen && roleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden my-auto">
            <div className="bg-gradient-to-r from-[#223249] to-[#1a2638] text-white p-5 px-6 flex items-center justify-between border-b border-sky-900/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 backdrop-blur-md flex items-center justify-center border border-rose-400/30 text-rose-300">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Hapus Peran</h2>
                  <p className="text-xs text-rose-200">Konfirmasi penghapusan peran kustom</p>
                </div>
              </div>
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus peran <b className="text-slate-900 font-bold">{roleToDelete.name}</b>? Tindakan ini akan menghapus seluruh relasi hak akses dari peran ini secara permanen.
              </p>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-800">
                Pastikan tidak ada akun pengguna yang masih memakai peran ini sebelum dihapus.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deletingRole}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {deletingRole ? "Menghapus..." : "Ya, Hapus Peran"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
