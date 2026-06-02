import { BaseEntity } from './index';

export type Contact = BaseEntity & {
  code: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PROSPECT';
};

export type Lead = BaseEntity & {
  code: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  source: 'WEBSITE' | 'PHONE' | 'EMAIL' | 'OTHER';
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST';
};

export type Deal = BaseEntity & {
  code: string;
  name: string;
  leadId?: string;
  contactId?: string;
  value: number;
  stage: 'PROSPECT' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';
  closeDate?: Date;
};
