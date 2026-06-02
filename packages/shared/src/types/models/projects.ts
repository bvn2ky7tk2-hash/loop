import { BaseEntity } from './index';

export type Project = BaseEntity & {
  code: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  status: 'PLANNING' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  budget?: number;
};

export type Task = BaseEntity & {
  code: string;
  projectId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  startDate: Date;
  dueDate: Date;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
};
