// API Request DTOs - define request shapes that differ from domain models

export type PaginationParams = {
  page?: number;
  limit?: number;
  search?: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
};

export type BulkActionRequest = {
  ids: string[];
  action: string;
  payload?: Record<string, any>;
};
