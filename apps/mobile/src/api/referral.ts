import { api } from './client';

export type CandidateStage = 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED';

export interface JobOpeningLite { id: string; code: string; title: string }

export interface MyReferral {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  stage: CandidateStage;
  createdAt: string;
  jobOpening?: { id: string; title: string; code: string } | null;
}

export const referralApi = {
  openings: () => api.get<JobOpeningLite[]>('/recruit/candidates/refer/openings'),
  myReferrals: () => api.get<MyReferral[]>('/recruit/candidates/my-referrals'),
  refer: (data: { name: string; email?: string; phone?: string; jobOpeningId: string; note?: string }) =>
    api.post<MyReferral>('/recruit/candidates/refer', data),
};
