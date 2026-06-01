import { apiClient } from './client';

export type OtStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

/** @deprecated use OtStatus */
export type OvertimeStatus = OtStatus;

export interface OvertimeRequest {
  id: string;
  employeeId: string;
  employee: { id: string; fullName: string; code: string; orgUnit?: { name: string } | null; position?: { jobTitle?: { name: string } | null } | null };
  date: string;
  fromTime?: string | null;
  toTime?: string | null;
  hours: number;
  reason?: string | null;
  status: OtStatus;
  processInstanceId?: string | null;
  rejectedReason?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface PaginatedOvertime {
  data: OvertimeRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateOtDto {
  employeeId: string;
  date: string;
  fromTime?: string;
  toTime?: string;
  hours: number;
  reason?: string;
}

/** @deprecated use CreateOtDto */
export type CreateOvertimeDto = CreateOtDto;

export interface RejectOtDto {
  rejectedReason: string;
}

export interface OtListParams {
  employeeId?: string;
  orgUnitId?: string;
  status?: OtStatus;
  month?: number;
  year?: number;
  page?: number;
  limit?: number;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'time' | 'select';
  required?: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
  options?: { label: string; value: string }[];
}

export const otApi = {
  getFormSchema: (): Promise<{ fields: FormField[] }> =>
    apiClient.get<{ fields: FormField[] }>('/overtime/form-schema').then((r) => r.data),

  list: (params?: OtListParams) =>
    apiClient.get<PaginatedOvertime>('/overtime', { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<OvertimeRequest>(`/overtime/${id}`).then((r) => r.data),

  create: (data: CreateOtDto) =>
    apiClient.post<OvertimeRequest>('/overtime', data).then((r) => r.data),

  cancel: (id: string) =>
    apiClient.patch<OvertimeRequest>(`/overtime/${id}/cancel`, {}).then((r) => r.data),

  approveDirectly: (id: string) =>
    apiClient.patch<OvertimeRequest>(`/overtime/${id}/approve`, {}).then((r) => r.data),

  reject: (id: string, data: RejectOtDto) =>
    apiClient.patch<OvertimeRequest>(`/overtime/${id}/reject`, data).then((r) => r.data),
};

/** @deprecated use otApi */
export const overtimeApi = {
  list: (params: { employeeId: string; page?: number; limit?: number }) =>
    otApi.list(params),
  create: (data: CreateOtDto) => otApi.create(data),
  cancel: (id: string) => otApi.cancel(id),
};
