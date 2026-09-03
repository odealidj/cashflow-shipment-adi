export interface PaginationMeta {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ApiResponse<T = any> {
  status: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
  errors?: any;
}
