import { BaseEntity } from './index';

export type Invoice = BaseEntity & {
  code: string;
  contactId: string;
  amount: number;
  currency: string;
  issueDate: Date;
  dueDate: Date;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
};

export type Expense = BaseEntity & {
  code: string;
  employeeId: string;
  amount: number;
  category: string;
  date: Date;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REIMBURSED';
};

export type Budget = BaseEntity & {
  code: string;
  department: string;
  year: number;
  amount: number;
  spent: number;
};
