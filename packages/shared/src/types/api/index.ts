// Common API request/response types

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta?: {
    timestamp: string;
    version: string;
  };
};

export type PaginationQuery = {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
};

export type CreateRequest<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type UpdateRequest<T> = Partial<CreateRequest<T>>;

export type ApiError = {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
};

export * from './requests';
export * from './responses';
