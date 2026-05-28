import { apiClient } from './client';

export type VendorStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
export type PoStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

export interface Vendor {
  id:          string;
  code:        string;
  name:        string;
  category?:   string | null;
  contactName?: string | null;
  email?:      string | null;
  phone?:      string | null;
  address?:    string | null;
  taxCode?:    string | null;
  bankAccount?: string | null;
  bankName?:   string | null;
  rating?:     number | null;
  status:      VendorStatus;
  notes?:      string | null;
  createdAt:   string;
  _count?:     { purchaseOrders: number };
}

export interface PoItem {
  id:           string;
  description:  string;
  unit?:        string | null;
  quantity:     number | string;
  unitPrice:    number | string;
  totalPrice:   number | string;
  receivedQty:  number | string;
  status:       string;
}

export interface PurchaseOrder {
  id:           string;
  poNumber:     string;
  vendorId:     string;
  vendor?:      { id: string; name: string; code: string };
  requesterId:  string;
  requester?:   { id: string; name: string };
  approverId?:  string | null;
  approver?:    { id: string; name: string } | null;
  status:       PoStatus;
  currency:     string;
  totalAmount:  number | string;
  taxAmount:    number | string;
  notes?:       string | null;
  deliveryDate?: string | null;
  approvedAt?:  string | null;
  receivedAt?:  string | null;
  createdAt:    string;
  items?:       PoItem[];
  _count?:      { items: number };
}

export interface ProcurementStats {
  totalVendors:  number;
  activeVendors: number;
  totalPos:      number;
  pendingPos:    number;
  totalSpend:    number;
}

const BASE = '/procurement';

export const procurementApi = {
  stats: () => apiClient.get<ProcurementStats>(`${BASE}/stats`).then(r => r.data),

  // Vendors
  listVendors: (params?: { page?: number; limit?: number; status?: string; category?: string; search?: string }) =>
    apiClient.get<{ data: Vendor[]; total: number; page: number; limit: number }>(`${BASE}/vendors`, { params }).then(r => r.data),

  getVendor: (id: string) => apiClient.get<Vendor>(`${BASE}/vendors/${id}`).then(r => r.data),

  createVendor: (data: Partial<Vendor>) => apiClient.post<Vendor>(`${BASE}/vendors`, data).then(r => r.data),

  updateVendor: (id: string, data: Partial<Vendor>) => apiClient.put<Vendor>(`${BASE}/vendors/${id}`, data).then(r => r.data),

  deleteVendor: (id: string) => apiClient.delete(`${BASE}/vendors/${id}`).then(r => r.data),

  // Purchase Orders
  listPos: (params?: { page?: number; limit?: number; status?: string; vendorId?: string; search?: string }) =>
    apiClient.get<{ data: PurchaseOrder[]; total: number; page: number; limit: number }>(`${BASE}/purchase-orders`, { params }).then(r => r.data),

  getPo: (id: string) => apiClient.get<PurchaseOrder>(`${BASE}/purchase-orders/${id}`).then(r => r.data),

  createPo: (data: { vendorId: string; notes?: string; currency?: string; deliveryDate?: string; items: { description: string; unit?: string; quantity: number; unitPrice: number }[] }) =>
    apiClient.post<PurchaseOrder>(`${BASE}/purchase-orders`, data).then(r => r.data),

  updateStatus: (id: string, status: string, notes?: string) =>
    apiClient.put<PurchaseOrder>(`${BASE}/purchase-orders/${id}/status`, { status, notes }).then(r => r.data),

  deletePo: (id: string) => apiClient.delete(`${BASE}/purchase-orders/${id}`).then(r => r.data),
};
