import { api } from './client';

export type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';

export interface ExpenseItem {
  id?: string;
  description: string;
  amount: number;
  category: string;
}

export interface Expense {
  id: string;
  title: string;
  description?: string;
  totalAmount: number;
  status: ExpenseStatus;
  submittedAt?: string;
  createdAt: string;
  items: ExpenseItem[];
  approver?: { id: string; fullName: string };
  rejectionReason?: string;
}

export const expensesApi = {
  list: () =>
    api.get<{ data: Expense[]; meta: { total: number } }>('/expenses?page=1&limit=100'),
  create: (data: {
    title: string;
    description?: string;
    items: { description: string; amount: number; category: string }[];
  }) => api.post<Expense>('/expenses', data),
  cancel: (id: string) => api.patch<Expense>(`/expenses/${id}/cancel`, {}),
};
