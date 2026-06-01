import { apiClient } from './client';

export type SkillCategory = 'TECHNICAL' | 'SOFT' | 'LANGUAGE' | 'DOMAIN' | 'CERTIFICATION';
export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { employees: number };
}

export interface EmployeeSkill {
  id: string;
  employeeId: string;
  skillId: string;
  level: SkillLevel;
  yearsExp: number;
  notes?: string | null;
  certifiedAt?: string | null;
  updatedAt: string;
  skill: Skill;
}

export interface SkillStat {
  id: string;
  name: string;
  category: SkillCategory;
  totalEmployees: number;
  levelDistribution: Record<SkillLevel, number>;
}

export interface EmployeeWithSkills {
  id: string;
  code: string;
  fullName: string;
  level: string;
  user: { name: string };
  orgUnit: { name: string };
  skills: EmployeeSkill[];
}

export interface ResourceAvailabilityItem {
  id:                 string;
  code:               string;
  fullName:           string;
  level:              string;
  user:               { name: string };
  orgUnit:            { name: string } | null;
  skills:             EmployeeSkill[];
  allocations:        { projectId: string; projectName: string; projectCode: string; pct: number }[];
  totalAllocationPct: number;
  availablePct:       number;
}

export interface PaginatedMatrix {
  data: EmployeeWithSkills[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const BASE = '/skills';

export const skillsApi = {
  // ── Master skill list ──────────────────────────────────────────────────────
  listSkills: (category?: SkillCategory, includeInactive = false) =>
    apiClient.get<Skill[]>(BASE, { params: { category, includeInactive } }).then(r => r.data),

  createSkill: (data: { name: string; category?: SkillCategory; description?: string }) =>
    apiClient.post<Skill>(BASE, data).then(r => r.data),

  updateSkill: (id: string, data: Partial<{ name: string; category: SkillCategory; description: string; isActive: boolean }>) =>
    apiClient.patch<Skill>(`${BASE}/${id}`, data).then(r => r.data),

  deleteSkill: (id: string) =>
    apiClient.delete(`${BASE}/${id}`).then(r => r.data),

  // ── Skill stats ────────────────────────────────────────────────────────────
  getSkillStats: () =>
    apiClient.get<SkillStat[]>(`${BASE}/stats`).then(r => r.data),

  // ── Skill matrix ───────────────────────────────────────────────────────────
  getSkillMatrix: (params: { orgUnitId?: string; skillIds?: string; page?: number; limit?: number }) =>
    apiClient.get<PaginatedMatrix>(`${BASE}/matrix`, { params }).then(r => r.data),

  // ── Resource availability ─────────────────────────────────────────────────
  getResourceAvailability: (params?: { skillId?: string; skillLevel?: string; date?: string }) =>
    apiClient.get<ResourceAvailabilityItem[]>(`${BASE}/resource-availability`, { params }).then(r => r.data),

  // ── Employee skills ────────────────────────────────────────────────────────
  getEmployeeSkills: (employeeId: string) =>
    apiClient.get<EmployeeSkill[]>(`${BASE}/employees/${employeeId}`).then(r => r.data),

  upsertEmployeeSkill: (
    employeeId: string,
    skillId: string,
    data: { level: SkillLevel; yearsExp?: number; notes?: string; certifiedAt?: string },
  ) =>
    apiClient.patch<EmployeeSkill>(`${BASE}/employees/${employeeId}/${skillId}`, data).then(r => r.data),

  removeEmployeeSkill: (employeeId: string, skillId: string) =>
    apiClient.delete(`${BASE}/employees/${employeeId}/${skillId}`).then(r => r.data),
};
