"use client";

import { useEffect, useState, useCallback } from "react";
import { API_BASE_URL, fetchWithAuth } from "@/lib/apiClient";

export interface UserSession {
  session_id?: string;
  user_id: string;
  id?: string;
  email: string;
  phone?: string;
  full_name: string;
  role: "super_admin" | "admin" | "finance" | "direktur" | "owner" | "operator" | "viewer";
  role_id?: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  permissions?: string[];
}

export function useAuth() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSession = useCallback(async () => {
    try {
      // 1. Initial fast load from localStorage if exists
      const localUser = localStorage.getItem("user");
      if (localUser) {
        try {
          setUser(JSON.parse(localUser));
        } catch (_) {}
      }

      // 2. Fetch fresh active session from Backend (Two-Tier Session verification)
      const res = await fetchWithAuth(`${API_BASE_URL}/auth/me`);
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          setUser(data.data);
          localStorage.setItem("user", JSON.stringify(data.data));
        }
      } else if (res.status === 401) {
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    } catch (err) {
      console.error("Failed to load session:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const logout = async () => {
    try {
      await fetchWithAuth(`${API_BASE_URL}/auth/logout`, { method: "POST" });
    } catch (_) {}
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin";
  const isFinance = user?.role === "finance" || user?.role === "operator";
  const isDirektur = user?.role === "direktur";
  const isOwner = user?.role === "owner" || user?.role === "viewer";

  // Dynamic Fine-Grained Permission Checker (PBAC)
  const can = useCallback((permissionCode: string): boolean => {
    if (!user) return false;
    // Super Admin IT has universal fail-safe bypass (*)
    if (user.role === "super_admin") return true;
    if (user.permissions?.includes("*")) return true;
    return user.permissions?.includes(permissionCode) ?? false;
  }, [user]);

  const canAny = useCallback((permissionCodes: string[]): boolean => {
    return permissionCodes.some((code) => can(code));
  }, [can]);

  const canAll = useCallback((permissionCodes: string[]): boolean => {
    return permissionCodes.every((code) => can(code));
  }, [can]);

  // Enterprise User Management Hierarchy Guard (3 Golden Rules & C-Level Immunity)
  const canManageUser = useCallback((targetRole: string, targetUserId?: string): { allowed: boolean; reason?: string } => {
    if (!user) return { allowed: false, reason: "Sesi tidak ditemukan" };
    const currentUserId = user.user_id || user.id;

    // Golden Rule 1: Anti Self-Deletion
    if (targetUserId && targetUserId === currentUserId) {
      return { allowed: false, reason: "Anda tidak dapat menghapus atau menonaktifkan akun sendiri" };
    }

    // Super Admin can manage anyone
    if (user.role === "super_admin") {
      return { allowed: true };
    }

    // Target is Super Admin -> Protected from everyone else
    if (targetRole === "super_admin") {
      return { allowed: false, reason: "Akun Super Admin IT memiliki proteksi khusus" };
    }

    // Golden Rule 3: C-Level Immunity (Admin cannot manage Direktur or Owner)
    if (user.role === "admin" && (targetRole === "direktur" || targetRole === "owner")) {
      return { allowed: false, reason: "Administrator tidak memiliki wewenang untuk mengelola akun Direktur atau Pemilik Perusahaan" };
    }

    // C-Level Authority: Owner & Direktur can manage Admin and all lower staff
    if (user.role === "owner" || user.role === "direktur") {
      return { allowed: true };
    }

    // Admin can manage Admin, Finance, etc.
    if (user.role === "admin") {
      return { allowed: true };
    }

    // Other roles: check explicit permissions
    return { allowed: can("users.edit") };
  }, [user, can]);

  // High-level role helpers (backwards-compatible)
  const canManageUsers = isSuperAdmin || can("users.view");
  const canDeleteData = isSuperAdmin || can("cashflow.delete");
  const canMutateData = isSuperAdmin || can("cashflow.create");

  return {
    user,
    loading,
    logout,
    refreshSession: fetchSession,
    isSuperAdmin,
    isAdmin,
    isFinance,
    isDirektur,
    isOwner,
    can,
    canAny,
    canAll,
    canManageUser,
    canManageUsers,
    canDeleteData,
    canMutateData,
  };
}
