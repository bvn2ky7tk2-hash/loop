import { apiClient } from './client';

export interface Profile360 {
  personal: {
    id: string;
    code: string;
    fullName: string;
    email?: string;
    birthdate?: string;
    startDate: string;
    idType?: string;
    idNumber?: string;
    permanentAddress?: string;
    currentAddress?: string;
    bankAccount?: string;
    bankName?: string;
    nationality?: string;
    orgUnit?: { name: string };
    position?: { code: string; jobTitle?: { name: string } };
    employeeStatus: string;
    isActive: boolean;
  };
  workHistory: Array<{
    id: string;
    eventType: string;
    eventDate: string;
    title: string;
    description?: string;
  }>;
  salaryHistory: Array<{
    id: string;
    basicSalary: number;
    effectiveDate: string;
    source?: string;
  }>;
  insurance?: {
    status: string;
    insuranceSalary: number;
    startDate: string;
    bhxhBookNumber?: string;
  };
  decisions: Array<{
    id: string;
    type: string;
    status: string;
    effectiveDate: string;
    decisionNumber?: string;
  }>;
  contracts: Array<{
    id: string;
    type: string;
    status: string;
    startDate: string;
    salaryMonthly: number;
  }>;
  training: Array<{
    id: string;
    program?: { title: string };
    status: string;
    startDate: string;
  }>;
  performance: Array<{
    id: string;
    period: string;
    score?: number;
    status: string;
  }>;
}

export const hrProfileApi = {
  get360: (employeeId: string) =>
    apiClient
      .get<Profile360>(`/hr-profile/${employeeId}`)
      .then((r) => r.data),

  updatePersonal: (employeeId: string, data: Partial<Profile360['personal']>) =>
    apiClient
      .patch(`/hr-profile/${employeeId}/personal`, data)
      .then((r) => r.data),

  getDependents: (employeeId: string) =>
    apiClient
      .get(`/hr-profile/${employeeId}/dependents`)
      .then((r) => r.data),
};
