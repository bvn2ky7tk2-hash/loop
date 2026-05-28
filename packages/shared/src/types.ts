import { Role, TaskStatus, ProjectStatus, ProjectType, EmployeeLevel, NotificationType, BudgetCurrency } from './enums';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  orgUnitIds: string[];
}

export interface OrgUnit {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
  children?: OrgUnit[];
}

export interface Employee {
  id: string;
  fullName: string;
  email: string;
  level: EmployeeLevel;
  orgUnitId: string;
  currentRate?: number;
  currency?: BudgetCurrency;
}

export interface ProjectSummary {
  id: string;
  name: string;
  code: string;
  type: ProjectType;
  status: ProjectStatus;
  pmId: string;
  startDate: string;
  endDate: string;
  progress: number;
}

export interface TaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  assigneeId: string | null;
  parentId: string | null;
  level: number;
  dueDate: string | null;
  estimateHours: number;
  actualHours: number;
  progress: number;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  payload?: Record<string, unknown>;
}
