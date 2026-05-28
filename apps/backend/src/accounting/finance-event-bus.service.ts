import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';

export type FinanceEventType = 'invoice.paid' | 'expense.approved' | 'payroll.approved';

export interface FinanceEvent {
  type:      FinanceEventType;
  refId:     string;   // invoiceId / expenseId / payrollPeriodId
  amount:    number;
  currency?: string;
  userId:    string;
}

@Injectable()
export class FinanceEventBus {
  private readonly emitter = new EventEmitter();

  emit(event: FinanceEvent): void {
    this.emitter.emit(event.type, event);
  }

  on(type: FinanceEventType, handler: (e: FinanceEvent) => void): void {
    this.emitter.on(type, handler);
  }

  off(type: FinanceEventType, handler: (e: FinanceEvent) => void): void {
    this.emitter.off(type, handler);
  }
}
