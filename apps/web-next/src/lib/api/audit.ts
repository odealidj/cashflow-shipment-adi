import { API_BASE_URL, fetchWithAuth } from "@/lib/apiClient";

export type AuditSeverity = "NORMAL" | "WARNING" | "CRITICAL";

export type AuditAction = 
  | "CREATE" 
  | "UPDATE" 
  | "DELETE" 
  | "VOID" 
  | "RESCHEDULE_DUE_DATE" 
  | "SETTLE_INVOICE" 
  | "EXPORT_EXCEL" 
  | "LOGIN";

export interface AuditLog {
  id: number;
  actor_id?: string;
  actor_name: string;
  actor_role: string;
  action: AuditAction;
  entity_type: string;
  entity_id: string;
  entity_reference: string;
  event_date?: string;
  system_timestamp: string;
  lag_days: number;
  severity: AuditSeverity;
  flag_reason?: string;
  old_values?: Record<string, any> | string;
  new_values?: Record<string, any> | string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface AuditSummaryKPI {
  total_logs: number;
  total_critical: number;
  total_warning: number;
  total_late_inputs: number;
  avg_cashflow_lag_days: number;
  avg_invoice_lag_days: number;
  total_anomalies_count: number;
  total_staff_monitored: number;
}

export interface StaffSLAItem {
  actor_id?: string;
  actor_name: string;
  actor_role: string;
  total_entries: number;
  on_time_entries: number;
  acceptable_entries: number;
  critical_late_entries: number;
  on_time_percentage: number;
  avg_lag_days: number;
  total_edits: number;
  total_deletions: number;
  last_active_at: string;
}

export interface FraudAnomalyItem {
  id: number;
  actor_name: string;
  actor_role: string;
  action: AuditAction;
  entity_type: string;
  entity_id: string;
  entity_reference: string;
  event_date?: string;
  system_timestamp: string;
  lag_days: number;
  severity: AuditSeverity;
  flag_reason: string;
  old_values?: Record<string, any> | string;
  new_values?: Record<string, any> | string;
  created_at: string;
}

export interface PaginatedAuditResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export async function getAuditSummary(): Promise<AuditSummaryKPI> {
  const res = await fetchWithAuth(`${API_BASE_URL}/audit/summary`);
  if (!res.ok) {
    throw new Error("Gagal memuat ringkasan KPI audit");
  }
  const json = await res.json();
  return json.data;
}

export async function getStaffScorecard(): Promise<StaffSLAItem[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}/audit/staff-scorecard`);
  if (!res.ok) {
    throw new Error("Gagal memuat rapor kepatuhan staf");
  }
  const json = await res.json();
  return json.data || [];
}

export async function getAuditAnomalies(page = 1, limit = 20, search = ""): Promise<PaginatedAuditResponse<FraudAnomalyItem>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search) params.set("search", search);

  const res = await fetchWithAuth(`${API_BASE_URL}/audit/anomalies?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Gagal memuat daftar radar anomali");
  }
  return res.json();
}

export async function getInputLagRecords(page = 1, limit = 20, search = "", minLag?: number): Promise<PaginatedAuditResponse<AuditLog>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search) params.set("search", search);
  if (minLag !== undefined) params.set("min_lag_days", String(minLag));

  const res = await fetchWithAuth(`${API_BASE_URL}/audit/input-lag?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Gagal memuat catatan keterlambatan input");
  }
  return res.json();
}

export async function getForensicLogs(
  page = 1, 
  limit = 20, 
  search = "", 
  severity?: string, 
  action?: string,
  entityType?: string
): Promise<PaginatedAuditResponse<AuditLog>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search) params.set("search", search);
  if (severity) params.set("severity", severity);
  if (action) params.set("action", action);
  if (entityType) params.set("entity_type", entityType);

  const res = await fetchWithAuth(`${API_BASE_URL}/audit/logs?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Gagal memuat log forensik audit");
  }
  return res.json();
}

export async function getAuditLogDetail(id: number): Promise<AuditLog> {
  const res = await fetchWithAuth(`${API_BASE_URL}/audit/logs/${id}`);
  if (!res.ok) {
    throw new Error("Gagal memuat rincian log audit");
  }
  const json = await res.json();
  return json.data;
}
