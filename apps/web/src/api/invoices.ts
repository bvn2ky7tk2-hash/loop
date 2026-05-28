import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type InvoiceType   = 'SALES' | 'PURCHASE';
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface InvoiceItem {
  id:          string;
  invoiceId:   string;
  description: string;
  quantity:    string;
  unitPrice:   string;
  amount:      string;
  taxRate:     string;
}

export interface Invoice {
  id:                string;
  code:              string;
  type:              InvoiceType;
  customerId?:       string;
  projectId?:        string;
  issueDate:         string;
  dueDate:           string;
  status:            InvoiceStatus;
  subtotal:          string;
  taxAmount:         string;
  totalAmount:       string;
  currency:          string;
  notes?:            string;
  paidAt?:           string;
  processInstanceId?: string;
  createdById:       string;
  createdAt:         string;
  updatedAt:         string;
  items:             InvoiceItem[];
  customer?:         { id: string; name: string };
}

export interface InvoiceSummary {
  draft:         { count: number; total: number };
  sent:          { count: number; total: number };
  overdue:       { count: number; total: number };
  paidThisMonth: { count: number; total: number };
}

export interface PaginatedInvoices {
  data:       Invoice[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export interface InvoiceItemInput {
  description: string;
  quantity:    number;
  unitPrice:   number;
  taxRate?:    number;
}

export interface CreateInvoiceInput {
  type:        InvoiceType;
  customerId?: string;
  projectId?:  string;
  issueDate:   string;
  dueDate:     string;
  currency?:   string;
  notes?:      string;
  items:       InvoiceItemInput[];
}

export interface FilterInvoiceParams {
  type?:       InvoiceType;
  status?:     InvoiceStatus;
  customerId?: string;
  projectId?:  string;
  dateFrom?:   string;
  dateTo?:     string;
  page?:       number;
  limit?:      number;
}

// ─── Query keys ──────────────────────────────────────────────────────────────

export const invoiceKeys = {
  all:     ['invoices'] as const,
  list:    (p: object) => ['invoices', 'list', p] as const,
  detail:  (id: string) => ['invoices', id] as const,
  summary: ['invoices', 'summary'] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export const useGetInvoiceSummary = () =>
  useQuery<InvoiceSummary>({
    queryKey: invoiceKeys.summary,
    queryFn:  () => apiClient.get<InvoiceSummary>('/invoices/summary').then(r => r.data),
  });

export const useGetInvoices = (params: FilterInvoiceParams = {}) =>
  useQuery<PaginatedInvoices>({
    queryKey: invoiceKeys.list(params),
    queryFn:  () => apiClient.get<PaginatedInvoices>('/invoices', { params }).then(r => r.data),
  });

export const useGetInvoice = (id: string) =>
  useQuery<Invoice>({
    queryKey: invoiceKeys.detail(id),
    queryFn:  () => apiClient.get<Invoice>(`/invoices/${id}`).then(r => r.data),
    enabled:  !!id,
  });

export const useCreateInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInvoiceInput) =>
      apiClient.post<Invoice>('/invoices', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceKeys.all });
      qc.invalidateQueries({ queryKey: invoiceKeys.summary });
    },
  });
};

export const useUpdateInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateInvoiceInput> }) =>
      apiClient.put<Invoice>(`/invoices/${id}`, data).then(r => r.data),
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: invoiceKeys.all });
      qc.invalidateQueries({ queryKey: invoiceKeys.detail(inv.id) });
    },
  });
};

export const useChangeInvoiceStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
      apiClient.patch<Invoice>(`/invoices/${id}/status`, { status }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceKeys.all });
      qc.invalidateQueries({ queryKey: invoiceKeys.summary });
    },
  });
};

export const useDeleteInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/invoices/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceKeys.all });
      qc.invalidateQueries({ queryKey: invoiceKeys.summary });
    },
  });
};
