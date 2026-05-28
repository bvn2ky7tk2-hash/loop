import { apiClient } from './client';
import axios from 'axios';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketStatus   = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface CustomerPortal {
  id:                 string;
  name:               string;
  customerId:         string;
  customer?:          { id: string; name: string; code: string };
  token:              string;
  allowedContractIds: string[];
  isActive:           boolean;
  expiresAt?:         string | null;
  welcomeMessage?:    string | null;
  createdAt:          string;
  _count?:            { tickets: number };
}

export interface CustomerTicket {
  id:          string;
  portalId:    string;
  portal?:     { id: string; name: string; customer?: { name: string } };
  title:       string;
  description: string;
  priority:    TicketPriority;
  status:      TicketStatus;
  submittedBy?: string | null;
  response?:   string | null;
  resolvedAt?: string | null;
  createdAt:   string;
  updatedAt:   string;
}

export interface PortalData {
  portal: {
    id:             string;
    name:           string;
    welcomeMessage?: string | null;
    customer:       { id: string; name: string; code: string; industry?: string | null };
  };
  contracts: any[];
  deals:     any[];
  tickets:   CustomerTicket[];
}

const ADMIN_BASE  = '/crm/portals';
const PUBLIC_BASE = '/public/portal';

export const portalAdminApi = {
  list: (customerId?: string) =>
    apiClient.get<CustomerPortal[]>(ADMIN_BASE, { params: customerId ? { customerId } : {} }).then(r => r.data),

  get: (id: string) =>
    apiClient.get<CustomerPortal & { tickets: CustomerTicket[] }>(`${ADMIN_BASE}/${id}`).then(r => r.data),

  create: (data: { name: string; customerId: string; allowedContractIds?: string[]; welcomeMessage?: string; expiresAt?: string }) =>
    apiClient.post<CustomerPortal>(ADMIN_BASE, data).then(r => r.data),

  update: (id: string, data: Partial<{ name: string; allowedContractIds: string[]; isActive: boolean; welcomeMessage: string; expiresAt: string }>) =>
    apiClient.put<CustomerPortal>(`${ADMIN_BASE}/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    apiClient.delete(`${ADMIN_BASE}/${id}`).then(r => r.data),

  allTickets: (portalId?: string, status?: string) =>
    apiClient.get<CustomerTicket[]>(`${ADMIN_BASE}/tickets`, { params: { portalId, status } }).then(r => r.data),

  respondTicket: (id: string, data: { status?: TicketStatus; response?: string }) =>
    apiClient.put<CustomerTicket>(`${ADMIN_BASE}/tickets/${id}/respond`, data).then(r => r.data),
};

// Public API — dùng path tuyệt đối (endpoint không có /api/v1 prefix)
const publicHttp = axios.create({ baseURL: '/', timeout: 10000 });

export const portalPublicApi = {
  getData: (token: string) =>
    publicHttp.get<PortalData>(`public/portal/${token}`).then(r => r.data),

  submitTicket: (token: string, data: { title: string; description: string; priority?: TicketPriority; submittedBy?: string }) =>
    publicHttp.post<CustomerTicket>(`public/portal/${token}/tickets`, data).then(r => r.data),
};
