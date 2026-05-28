-- Phase 3A: CRM Module

CREATE TABLE "customers" (
  "id" VARCHAR(36) NOT NULL DEFAULT gen_random_uuid()::text,
  "code" VARCHAR(50) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "industry" VARCHAR(100),
  "website" VARCHAR(255),
  "tax_code" VARCHAR(20),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "customers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customers_code_key" UNIQUE ("code")
);

CREATE TABLE "contacts" (
  "id" VARCHAR(36) NOT NULL DEFAULT gen_random_uuid()::text,
  "name" VARCHAR(200) NOT NULL,
  "email" VARCHAR(255),
  "phone" VARCHAR(50),
  "title" VARCHAR(100),
  "customer_id" VARCHAR(36),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "contacts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL
);
CREATE INDEX "idx_contacts_customer_id" ON "contacts"("customer_id");

CREATE TYPE "lead_source" AS ENUM ('WEBSITE', 'REFERRAL', 'SOCIAL', 'EVENT', 'COLD_OUTREACH', 'OTHER');
CREATE TYPE "lead_status" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST');
CREATE TYPE "deal_stage"  AS ENUM ('QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST');

CREATE TABLE "leads" (
  "id" VARCHAR(36) NOT NULL DEFAULT gen_random_uuid()::text,
  "title" VARCHAR(200) NOT NULL,
  "contact_id" VARCHAR(36),
  "source" "lead_source" NOT NULL,
  "status" "lead_status" NOT NULL DEFAULT 'NEW',
  "estimated_value" DECIMAL(18,2),
  "currency" VARCHAR(10) NOT NULL DEFAULT 'VND',
  "assignee_id" VARCHAR(36) NOT NULL,
  "notes" TEXT,
  "converted_deal_id" VARCHAR(36),
  "converted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "leads_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "leads_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL
);
CREATE INDEX "idx_leads_assignee_id" ON "leads"("assignee_id");
CREATE INDEX "idx_leads_status" ON "leads"("status");

CREATE TABLE "deals" (
  "id" VARCHAR(36) NOT NULL DEFAULT gen_random_uuid()::text,
  "code" VARCHAR(50) NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "customer_id" VARCHAR(36) NOT NULL,
  "stage" "deal_stage" NOT NULL DEFAULT 'QUALIFICATION',
  "value" DECIMAL(18,2),
  "currency" VARCHAR(10) NOT NULL DEFAULT 'VND',
  "probability" INTEGER,
  "expected_close_date" TIMESTAMPTZ,
  "assignee_id" VARCHAR(36) NOT NULL,
  "won_at" TIMESTAMPTZ,
  "lost_at" TIMESTAMPTZ,
  "lost_reason" TEXT,
  "project_id" VARCHAR(36),
  "process_instance_id" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "deals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "deals_code_key" UNIQUE ("code"),
  CONSTRAINT "deals_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT,
  CONSTRAINT "deals_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL
);
CREATE INDEX "idx_deals_customer_id" ON "deals"("customer_id");
CREATE INDEX "idx_deals_stage" ON "deals"("stage");
CREATE INDEX "idx_deals_assignee_id" ON "deals"("assignee_id");
