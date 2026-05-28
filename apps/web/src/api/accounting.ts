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

// ─── TT200: Báo cáo KQKD (Income Statement) ──────────────────────────────────

export interface IncomeStatementLineItem {
  code:       string;
  name:       string;
  amount:     number;
  isSubtotal: boolean;
}

export interface IncomeStatementReport {
  fromDate:         string;
  toDate:           string;
  lineItems:        IncomeStatementLineItem[];
  totalRevenue:     number;
  grossProfit:      number;
  operatingProfit:  number;
  ebt:              number;
  netIncome:        number;
}

export function useGetIncomeStatement(from: string, to: string) {
  return useQuery({
    queryKey: ['accounting', 'income-statement', from, to],
    queryFn: () =>
      apiClient
        .get<IncomeStatementReport>('/api/v1/accounting/reports/income-statement', { params: { from, to } })
        .then(r => r.data),
    enabled: !!from && !!to,
  });
}

// ─── TT200: Lưu chuyển tiền tệ (Cash Flow) ───────────────────────────────────

export interface CashFlowItem {
  code:   string;
  name:   string;
  amount: number;
}

export interface CashFlowSection {
  key:      string;
  title:    string;
  items:    CashFlowItem[];
  subtotal: number;
}

export interface CashFlowReport {
  fromDate:      string;
  toDate:        string;
  sections:      CashFlowSection[];
  netCashChange: number;
  operatingCF:   number;
  investingCF:   number;
  financingCF:   number;
}

export function useGetCashFlow(from: string, to: string) {
  return useQuery({
    queryKey: ['accounting', 'cash-flow', from, to],
    queryFn: () =>
      apiClient
        .get<CashFlowReport>('/api/v1/accounting/reports/cash-flow', { params: { from, to } })
        .then(r => r.data),
    enabled: !!from && !!to,
  });
}
