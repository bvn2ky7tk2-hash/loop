import { apiClient } from './client';

export interface EducationRecord {
  id: string;
  degreeLevel: string;
  schoolName: string;
  major?: string;
  startYear?: number;
  endYear?: number;
  graduationYear?: number;
  result?: string;
  certificateNumber?: string;
  isMainDegree: boolean;
  description?: string;
}

export interface WorkExperience {
  id: string;
  companyName: string;
  position?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface FamilyMember {
  id: string;
  relationship: string;
  fullName: string;
  birthdate?: string;
  idNumber?: string;
  occupation?: string;
  phoneNumber?: string;
  address?: string;
  note?: string;
  dependentId?: string | null;
  dependent?: {
    id: string;
    taxId?: string;
    registeredFrom: string;
    registeredTo?: string;
  } | null;
}

export interface Profile360 {
  personal: {
    id: string;
    code: string;
    fullName: string;
    email?: string;
    birthdate?: string;
    startDate: string;
    endDate?: string;
    tenure?: { years: number; months: number; totalMonths: number; formatted: string } | null;
    // Giấy tờ tùy thân
    idType?: string;
    idNumber?: string;
    idIssueDate?: string;
    idIssuePlace?: string;
    // Thông tin cá nhân mở rộng
    gender?: string;
    maritalStatus?: string;
    phoneNumber?: string;
    hometown?: string;
    placeOfBirth?: string;
    ethnicity?: string;
    religion?: string;
    nationality?: string;
    // Địa chỉ
    permanentAddress?: string;
    currentAddress?: string;
    // Ngân hàng
    bankAccount?: string;
    bankName?: string;
    // Liên hệ khẩn cấp & y tế & giám hộ (hồ sơ HR đầy đủ)
    secondaryPhone?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelation?: string;
    bloodType?: string;
    healthNote?: string;
    guardianName?: string;
    // Thuế & cư trú
    taxInfo?: { taxId?: string; residencyStatus?: string; wageZone?: number } | null;
    // Tổ chức
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
  education: EducationRecord[];
  workExperience: WorkExperience[];
  familyMembers: FamilyMember[];
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

  // Education
  getEducation: (employeeId: string) =>
    apiClient.get<EducationRecord[]>(`/employees/${employeeId}/education`).then((r) => r.data),

  createEducation: (employeeId: string, data: Omit<EducationRecord, 'id'>) =>
    apiClient.post<EducationRecord>(`/employees/${employeeId}/education`, data).then((r) => r.data),

  updateEducation: (employeeId: string, recordId: string, data: Partial<EducationRecord>) =>
    apiClient.put<EducationRecord>(`/employees/${employeeId}/education/${recordId}`, data).then((r) => r.data),

  deleteEducation: (employeeId: string, recordId: string) =>
    apiClient.delete(`/employees/${employeeId}/education/${recordId}`).then((r) => r.data),

  // Work Experience
  getWorkExperience: (employeeId: string) =>
    apiClient.get<WorkExperience[]>(`/employees/${employeeId}/work-experience`).then((r) => r.data),

  createWorkExperience: (employeeId: string, data: Omit<WorkExperience, 'id'>) =>
    apiClient.post<WorkExperience>(`/employees/${employeeId}/work-experience`, data).then((r) => r.data),

  updateWorkExperience: (employeeId: string, expId: string, data: Partial<WorkExperience>) =>
    apiClient.put<WorkExperience>(`/employees/${employeeId}/work-experience/${expId}`, data).then((r) => r.data),

  deleteWorkExperience: (employeeId: string, expId: string) =>
    apiClient.delete(`/employees/${employeeId}/work-experience/${expId}`).then((r) => r.data),

  // Family Members
  getFamilyMembers: (employeeId: string) =>
    apiClient.get<FamilyMember[]>(`/employees/${employeeId}/family-with-dependent`).then((r) => r.data),

  createFamilyMember: (employeeId: string, data: Omit<FamilyMember, 'id' | 'dependentId' | 'dependent'>) =>
    apiClient.post<FamilyMember>(`/employees/${employeeId}/family`, data).then((r) => r.data),

  updateFamilyMember: (employeeId: string, memberId: string, data: Partial<FamilyMember>) =>
    apiClient.put<FamilyMember>(`/employees/${employeeId}/family/${memberId}`, data).then((r) => r.data),

  deleteFamilyMember: (employeeId: string, memberId: string) =>
    apiClient.delete(`/employees/${employeeId}/family/${memberId}`).then((r) => r.data),

  registerDependent: (
    employeeId: string,
    memberId: string,
    data: { isDependent: boolean; taxId?: string; registeredFrom?: string; registeredTo?: string },
  ) =>
    apiClient.patch(`/employees/${employeeId}/family/${memberId}/dependent`, data).then((r) => r.data),
};
