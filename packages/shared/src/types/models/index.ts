// Base model types
export type BaseEntity = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: Pagination;
};

// User/Auth types
export type User = BaseEntity & {
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  isActive: boolean;
  roles: string[];
};

export type AuthToken = {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
};

// Common status enums
export enum RecordStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

// Export all sub-domain types
export * from './hr';
export * from './crm';
export * from './finance';
export * from './projects';
export * from './admin';
