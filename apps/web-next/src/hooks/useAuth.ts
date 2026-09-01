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
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
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

  // Permissions
  const canManageUsers = isSuperAdmin || isAdmin;
  const canDeleteData = isSuperAdmin || isAdmin;
  const canMutateData = isSuperAdmin || isAdmin || isFinance;

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
    canManageUsers,
    canDeleteData,
    canMutateData,
  };
}
