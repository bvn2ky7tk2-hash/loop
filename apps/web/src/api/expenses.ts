import { apiClient } from './client';

export type ExpenseCategory = 'TRAVEL' | 'MEALS' | 'EQUIPMENT' | 'SOFTWARE' | 'TRAINING' | 'OTHER';
export type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';

export interface ExpenseItem {
  id?: string;
  description: string;
  amount: number;
}

export interface Expense {
  id: string;
  projectId?: string;
  submittedById: string;
  title: string;
  category: ExpenseCategory;
  totalAmount: number;
  currency: string;
  status: ExpenseStatus;
  processInstanceId?: string | null;
  approvedById?: string;
  approvedAt?: string;
  rejectedReason?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  items: ExpenseItem[];
  project?: { id: string; name: string; code: string };
  submittedBy?: { id: string; name: string };
  approvedBy?: { id: string; name: string };
}

export interface PaginatedExpenses {
  data:       Expense[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export interface ExpenseFilterParams {
  page?: number;
  pageSize?: number;
  status?: ExpenseStatus;
  category?: ExpenseCategory;
  projectId?: string;
  submittedById?: string;
}

export const expensesApi = {
  list: (params?: ExpenseFilterParams) =>
    apiClient.get<PaginatedExpenses>('/expenses', { params }).then((r) => r.data),
  getOne: (id: string) =>
    apiClient.get<Expense>(`/expenses/${id}`).then((r) => r.data),
  create: (data: {
    title: string;
    category: ExpenseCategory;
    projectId?: string;
    employeeId?: string;
    note?: string;
    items: ExpenseItem[];
  }) => apiClient.post<Expense>('/expenses', data).then((r) => r.data),
  approve: (id: string, data: { status: 'APPROVED' | 'REJECTED' | 'PAID'; rejectedReason?: string }) =>
    apiClient.patch<Expense>(`/expenses/${id}/approve`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/expenses/${id}`),
};
