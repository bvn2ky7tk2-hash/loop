import { BaseEntity } from './index';

export type Role = BaseEntity & {
  code: string;
  name: string;
  description?: string;
  permissions: string[];
};

export type Permission = BaseEntity & {
  code: string;
  name: string;
  description?: string;
  module: string;
};

export type AuditLog = BaseEntity & {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  changes: Record<string, any>;
  timestamp: Date;
};
