export type NotificationSeverity = "CRITICAL" | "WARNING" | "INFO";
export type NotificationCategory = "INVOICE" | "CASHFLOW" | "VENDOR" | "SHIPMENT" | "SYSTEM";

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  category: NotificationCategory;
  action_url?: string;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface UnreadCountResponse {
  unread_count: number;
}
