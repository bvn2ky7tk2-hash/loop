import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type LeadSource = 'WEBSITE' | 'REFERRAL' | 'SOCIAL' | 'EVENT' | 'COLD_OUTREACH' | 'OTHER';
export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST';
export type DealStage  = 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';

export interface Customer {
  id:          string;
  code:        string;
  name:        string;
  industry?:   string;
  website?:    string;
  taxCode?:    string;
  createdAt:   string;
  updatedAt:   string;
  _count?: { contacts: number; deals: number };
}

export interface Contact {
  id:         string;
  name:       string;
  email?:     string;
  phone?:     string;
  title?:     string;
  customerId?: string;
  customer?:  { id: string; name: string };
}

export interface Lead {
  id:               string;
  title:            string;
  source:           LeadSource;
  status:           LeadStatus;
  estimatedValue?:  string;
  currency:         string;
  assigneeId:       string;
  notes?:           string;
  convertedDealId?: string;
  convertedAt?:     string;
  createdAt:        string;
  updatedAt:        string;
  assignee?:        { id: string; name: string };
  contact?:         { id: string; name: string };
}

export interface Deal {
  id:                string;
  code:              string;
  title:             string;
  customerId:        string;
  stage:             DealStage;
  value?:            string;
  currency:          string;
  probability?:      number;
  expectedCloseDate?: string;
  assigneeId:        string;
  wonAt?:            string;
  lostAt?:           string;
  lostReason?:       string;
  projectId?:        string;
  processInstanceId?: string;
  createdAt:         string;
  updatedAt:         string;
  customer?:         { id: string; name: string };
  assignee?:         { id: string; name: string };
}

export interface PaginatedResult<T> {
  data:       T[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

// ─── Query keys ──────────────────────────────────────────────────────────────

export const crmKeys = {
  customers: {
    all:    ['crm-customers'] as const,
    list:   (p: object) => ['crm-customers', 'list', p] as const,
    detail: (id: string) => ['crm-customers', id] as const,
  },
  contacts: {
    all:    ['crm-contacts'] as const,
    list:   (p: object) => ['crm-contacts', 'list', p] as const,
    detail: (id: string) => ['crm-contacts', id] as const,
  },
  leads: {
    all:    ['crm-leads'] as const,
    list:   (p: object) => ['crm-leads', 'list', p] as const,
    detail: (id: string) => ['crm-leads', id] as const,
  },
  deals: {
    all:    ['crm-deals'] as const,
    list:   (p: object) => ['crm-deals', 'list', p] as const,
    detail: (id: string) => ['crm-deals', id] as const,
  },
};

// ─── Customers ───────────────────────────────────────────────────────────────

export interface CustomerFilterDto {
  search?: string;
  industry?: string;
  page?: number;
  limit?: number;
}

export const useGetCustomers = (params: CustomerFilterDto = {}) =>
  useQuery<PaginatedResult<Customer>>({
    queryKey: crmKeys.customers.list(params),
    queryFn:  () => apiClient.get<PaginatedResult<Customer>>('/crm/customers', { params }).then(r => r.data),
  });

export const useGetCustomer = (id: string) =>
  useQuery<Customer>({
    queryKey: crmKeys.customers.detail(id),
    queryFn:  () => apiClient.get<Customer>(`/crm/customers/${id}`).then(r => r.data),
    enabled:  !!id,
  });

export const useCreateCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { code: string; name: string; industry?: string; website?: string; taxCode?: string }) =>
      apiClient.post<Customer>('/crm/customers', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.customers.all }),
  });
};

export const useUpdateCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ name: string; industry: string; website: string; taxCode: string }> }) =>
      apiClient.put<Customer>(`/crm/customers/${id}`, data).then(r => r.data),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: crmKeys.customers.all });
      qc.invalidateQueries({ queryKey: crmKeys.customers.detail(c.id) });
    },
  });
};

export const useDeleteCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/crm/customers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.customers.all }),
  });
};

// ─── Contacts ────────────────────────────────────────────────────────────────

export interface ContactFilterDto {
  search?: string;
  customerId?: string;
  page?: number;
  limit?: number;
}

export const useGetContacts = (params: ContactFilterDto = {}) =>
  useQuery<PaginatedResult<Contact>>({
    queryKey: crmKeys.contacts.list(params),
    queryFn:  () => apiClient.get<PaginatedResult<Contact>>('/crm/contacts', { params }).then(r => r.data),
  });

export const useCreateContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; email?: string; phone?: string; title?: string; customerId?: string }) =>
      apiClient.post<Contact>('/crm/contacts', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.contacts.all }),
  });
};

export const useUpdateContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ name: string; email: string; phone: string; title: string; customerId: string }> }) =>
      apiClient.put<Contact>(`/crm/contacts/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.contacts.all }),
  });
};

export const useDeleteContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/crm/contacts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.contacts.all }),
  });
};

// ─── Leads ───────────────────────────────────────────────────────────────────

export interface LeadFilterDto {
  status?: LeadStatus;
  source?: LeadSource;
  assigneeId?: string;
  page?: number;
  limit?: number;
}

export const useGetLeads = (params: LeadFilterDto = {}) =>
  useQuery<PaginatedResult<Lead>>({
    queryKey: crmKeys.leads.list(params),
    queryFn:  () => apiClient.get<PaginatedResult<Lead>>('/crm/leads', { params }).then(r => r.data),
  });

export const useCreateLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string; source: LeadSource; estimatedValue?: number;
      currency?: string; assigneeId: string; notes?: string; contactId?: string;
    }) => apiClient.post<Lead>('/crm/leads', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.leads.all }),
  });
};

export const useUpdateLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ title: string; source: LeadSource; status: LeadStatus; estimatedValue: number; notes: string; assigneeId: string }> }) =>
      apiClient.put<Lead>(`/crm/leads/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.leads.all }),
  });
};

export const useConvertLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { dealTitle: string; customerId?: string; dealValue?: number } }) =>
      apiClient.post<Deal>(`/crm/leads/${id}/convert`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.leads.all });
      qc.invalidateQueries({ queryKey: crmKeys.deals.all });
    },
  });
};

export const useDeleteLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/crm/leads/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.leads.all }),
  });
};

// ─── Deals ───────────────────────────────────────────────────────────────────

export interface DealFilterDto {
  stage?: DealStage;
  customerId?: string;
  assigneeId?: string;
  page?: number;
  limit?: number;
}

export const useGetDeals = (params: DealFilterDto = {}) =>
  useQuery<PaginatedResult<Deal>>({
    queryKey: crmKeys.deals.list(params),
    queryFn:  () => apiClient.get<PaginatedResult<Deal>>('/crm/deals', { params }).then(r => r.data),
  });

export const useCreateDeal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string; customerId: string; value?: number; currency?: string;
      probability?: number; expectedCloseDate?: string; assigneeId: string;
    }) => apiClient.post<Deal>('/crm/deals', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.deals.all }),
  });
};

export const useUpdateDeal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ title: string; value: number; probability: number; expectedCloseDate: string; stage: DealStage }> }) =>
      apiClient.put<Deal>(`/crm/deals/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.deals.all }),
  });
};

export const useMarkDealWon = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { projectName?: string; projectType?: string } }) =>
      apiClient.patch<Deal>(`/crm/deals/${id}/won`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.deals.all }),
  });
};

export const useMarkDealLost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { lostReason: string } }) =>
      apiClient.patch<Deal>(`/crm/deals/${id}/lost`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.deals.all }),
  });
};

export const useDeleteDeal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/crm/deals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.deals.all }),
  });
};
