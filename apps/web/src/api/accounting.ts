import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export interface ChartOfAccount {
  id:         string;
  code:       string;
  name:       string;
  type:       AccountType;
  parentCode: string | null;
  isActive:   boolean;
  createdAt:  string;
}

export interface JournalLine {
  id:          string;
  accountCode: string;
  debit:       string;
  credit:      string;
  description: string | null;
  account?:    { code: string; name: string };
}

export interface JournalEntry {
  id:          string;
  date:        string;
  description: string;
  reference:   string | null;
  createdById: string;
  createdAt:   string;
  lines:       JournalLine[];
}

export interface JournalLineInput {
  accountCode:  string;
  debit:        number;
  credit:       number;
  description?: string;
}

export interface CreateJournalInput {
  date:        string;
  description: string;
  reference?:  string;
  lines:       JournalLineInput[];
}

export interface JournalFilter {
  page?:        number;
  limit?:       number;
  dateFrom?:    string;
  dateTo?:      string;
  accountCode?: string;
  reference?:   string;
}

export interface PaginatedResult<T> {
  data:       T[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

// ─── Chart of Accounts ───────────────────────────────────────────────────────

export function useGetAccounts(type?: AccountType) {
  return useQuery({
    queryKey: ['accounting', 'accounts', type],
    queryFn: () => apiClient.get<ChartOfAccount[]>('/api/v1/accounting/accounts', { params: type ? { type } : {} }).then(r => r.data),
  });
}

// ─── Journal Entries ─────────────────────────────────────────────────────────

export function useGetJournal(filter: JournalFilter = {}) {
  return useQuery({
    queryKey: ['accounting', 'journal', filter],
    queryFn: () => apiClient.get<PaginatedResult<JournalEntry>>('/api/v1/accounting/journal', { params: filter }).then(r => r.data),
  });
}

export function useCreateJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateJournalInput) => apiClient.post<JournalEntry>('/api/v1/accounting/journal', dto).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounting', 'journal'] }),
  });
}

// ─── Financial Reports ────────────────────────────────────────────────────────

export interface FinancialReportRow {
  code: string;
  name: string;
  type: AccountType;
  balance: number;
}

export interface ProfitLossReport {
  startDate: string;
  endDate: string;
  revenue: FinancialReportRow[];
  totalRevenue: number;
  expenses: FinancialReportRow[];
  totalExpenses: number;
  netIncome: number;
}

export interface BalanceSheetReport {
  asOfDate: string;
  assets: FinancialReportRow[];
  totalAssets: number;
  liabilities: FinancialReportRow[];
  totalLiabilities: number;
  equity: FinancialReportRow[];
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
}

export function useGetProfitLoss(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['accounting', 'profit-loss', startDate, endDate],
    queryFn: () => apiClient.get<ProfitLossReport>('/api/v1/accounting/reports/profit-loss', { params: { startDate, endDate } }).then(r => r.data),
    enabled: !!startDate && !!endDate,
  });
}

export function useGetBalanceSheet(asOfDate: string) {
  return useQuery({
    queryKey: ['accounting', 'balance-sheet', asOfDate],
    queryFn: () => apiClient.get<BalanceSheetReport>('/api/v1/accounting/reports/balance-sheet', { params: { asOfDate } }).then(r => r.data),
    enabled: !!asOfDate,
  });
}
