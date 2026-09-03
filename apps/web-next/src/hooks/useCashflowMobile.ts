'use client';

import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export interface CashflowEntry {
  id: number;
  sequence_no: number;
  entry_type: 'SHIPMENT' | 'TOP_UP';
  kredit: number;
  debit: number;
  saldo: number;
  date_of_entry: string;
  act_information?: string;
  act_explaination?: string;
  vendor_name_raw?: string;
  vendor_id?: number;
  top_days?: number;
  due_date?: string;
  grand_cost: number;
  grand_selling: number;
  profit: number;
  margin_pct: number;
  remarks: 'PAID' | 'UNPAID' | 'PENDING';
  created_at: string;
}

export interface CashflowSummary {
  current_saldo: number;
  total_kredit: number;
  total_debit: number;
  total_profit: number;
  avg_margin_pct: number;
  unpaid_count: number;
  unpaid_amount: number;
}

export function useCashflowMobile() {
  const [entries, setEntries] = useState<CashflowEntry[]>([]);
  const [summary, setSummary] = useState<CashflowSummary>({
    current_saldo: 0,
    total_kredit: 0,
    total_debit: 0,
    total_profit: 0,
    avg_margin_pct: 0,
    unpaid_count: 0,
    unpaid_amount: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const getHeaders = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/cashflow/summary`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.status && json.data) {
          setSummary(json.data);
        }
      }
    } catch (err: any) {
      console.warn('Failed to fetch cashflow summary:', err);
    }
  }, [getHeaders]);

  const fetchEntries = useCallback(async (params: Record<string, string> = {}) => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        page: params.page || '1',
        limit: params.limit || '50',
        sort: params.sort || 'DESC',
        ...params,
      }).toString();

      const res = await fetch(`${API_BASE_URL}/cashflow?${query}`, {
        headers: getHeaders(),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.status && json.data) {
          if (Array.isArray(json.data)) {
            setEntries(json.data);
          } else if (Array.isArray(json.data.entries)) {
            setEntries(json.data.entries);
          } else {
            setEntries([]);
          }
        } else {
          setEntries([]);
        }
      } else {
        setEntries([]);
      }
    } catch (err: any) {
      console.warn('Error fetching cashflow entries:', err);
      setError(err.message || 'Gagal memuat transaksi');
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  const createEntry = async (payload: Partial<CashflowEntry>): Promise<{ success: boolean; error?: string }> => {
    try {
      const endpoint = payload.entry_type === 'TOP_UP' 
        ? `${API_BASE_URL}/cashflow/topup` 
        : `${API_BASE_URL}/cashflow/shipment`;

      const formattedPayload = {
        ...payload,
        date_of_entry: payload.date_of_entry 
          ? new Date(payload.date_of_entry).toISOString() 
          : new Date().toISOString(),
        due_date: payload.due_date 
          ? new Date(payload.due_date).toISOString() 
          : undefined,
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(formattedPayload),
      });
      const json = await res.json();
      if (res.ok && json.status) {
        await fetchSummary();
        await fetchEntries({ limit: '20' });
        return { success: true };
      }
      return { success: false, error: json.message || 'Gagal menyimpan transaksi' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Terjadi kesalahan jaringan' };
    }
  };

  const quickPay = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE_URL}/cashflow/${id}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ remarks: 'PAID' }),
      });
      const json = await res.json();
      if (res.ok && json.status) {
        await fetchSummary();
        await fetchEntries({ limit: '20' });
        return { success: true };
      }
      return { success: false, error: json.message || 'Gagal memperbarui status bayar' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Terjadi kesalahan jaringan' };
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchEntries({ limit: '20' });
  }, [fetchSummary, fetchEntries]);

  return {
    entries,
    summary,
    loading,
    error,
    fetchSummary,
    fetchEntries,
    createEntry,
    quickPay,
  };
}
