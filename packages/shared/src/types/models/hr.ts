import { BaseEntity } from './index';

export type Employee = BaseEntity & {
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department?: string;
  position?: string;
  startDate: Date;
  endDate?: Date | null;
  isActive: boolean;
};

export type Department = BaseEntity & {
  code: string;
  name: string;
  description?: string;
  parentId?: string;
};

export type Position = BaseEntity & {
  code: string;
  name: string;
  level: number;
};

export type Leave = BaseEntity & {
  employeeId: string;
  type: 'ANNUAL' | 'SICK' | 'UNPAID' | 'OTHER';
  startDate: Date;
  endDate: Date;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reason?: string;
};

export type Attendance = BaseEntity & {
  employeeId: string;
  date: Date;
  checkIn?: Date;
  checkOut?: Date;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EARLY_LEAVE';
};

export type Payroll = BaseEntity & {
  employeeId: string;
  month: Date;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: 'PENDING' | 'PROCESSED' | 'PAID';
};
