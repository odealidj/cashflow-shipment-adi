"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth, API_BASE_URL } from "@/lib/apiClient";
import { NotificationItem, UnreadCountResponse } from "@/types/notification";

interface FetchParams {
  limit?: number;
  unread_only?: boolean;
  category?: string;
  severity?: string;
}

export function useNotifications(autoPoll = true) {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/notifications/unread-count`);
      if (res.ok) {
        const json = await res.json();
        if (json.status && json.data) {
          const data: UnreadCountResponse = json.data;
          setUnreadCount(data.unread_count || 0);
        }
      }
    } catch (err) {
      console.error("Gagal mengambil jumlah notifikasi belum dibaca:", err);
    }
  }, []);

  const fetchNotifications = useCallback(async (params: FetchParams = {}) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (params.limit) query.set("limit", params.limit.toString());
      if (params.unread_only !== undefined) query.set("unread_only", params.unread_only.toString());
      if (params.category) query.set("category", params.category);
      if (params.severity) query.set("severity", params.severity);

      const url = `${API_BASE_URL}/notifications${query.toString() ? `?${query.toString()}` : ""}`;
      const res = await fetchWithAuth(url);
      if (res.ok) {
        const json = await res.json();
        if (json.status && Array.isArray(json.data)) {
          setNotifications(json.data);
        }
      }
    } catch (err) {
      console.error("Gagal mengambil daftar notifikasi:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/notifications/${id}/read`, {
        method: "PATCH",
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        return true;
      }
      return false;
    } catch (err) {
      console.error("Gagal menandai notifikasi dibaca:", err);
      return false;
    }
  }, []);

  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/notifications/read-all`, {
        method: "POST",
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
        );
        setUnreadCount(0);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Gagal menandai semua notifikasi dibaca:", err);
      return false;
    }
  }, []);

  const deleteNotification = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/notifications/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setNotifications((prev) => {
          const item = prev.find((n) => n.id === id);
          if (item && !item.is_read) {
            setUnreadCount((c) => Math.max(0, c - 1));
          }
          return prev.filter((n) => n.id !== id);
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error("Gagal menghapus notifikasi:", err);
      return false;
    }
  }, []);

  const triggerInvoiceCheck = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/notifications/check-invoices`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchUnreadCount();
        await fetchNotifications({ limit: 10 });
        return true;
      }
      return false;
    } catch (err) {
      console.error("Gagal memicu pemindaian invoice:", err);
      return false;
    }
  }, [fetchUnreadCount, fetchNotifications]);

  useEffect(() => {
    fetchUnreadCount();

    if (!autoPoll) return;

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 45000); // Polling setiap 45 detik

    const handleFocus = () => {
      fetchUnreadCount();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchUnreadCount, autoPoll]);

  return {
    unreadCount,
    notifications,
    loading,
    fetchUnreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    triggerInvoiceCheck,
  };
}
