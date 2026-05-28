-- CreateEnum
CREATE TYPE "invoice_type" AS ENUM ('SALES', 'PURCHASE');

-- CreateEnum
CREATE TYPE "invoice_status" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateTable
CREATE TABLE "invoices" (
    "id"                   TEXT NOT NULL,
    "code"                 TEXT NOT NULL,
    "type"                 "invoice_type" NOT NULL,
    "customer_id"          TEXT,
    "project_id"           TEXT,
    "issue_date"           DATE NOT NULL,
    "due_date"             DATE NOT NULL,
    "status"               "invoice_status" NOT NULL DEFAULT 'DRAFT',
    "subtotal"             DECIMAL(18,2) NOT NULL,
    "tax_amount"           DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_amount"         DECIMAL(18,2) NOT NULL,
    "currency"             TEXT NOT NULL DEFAULT 'VND',
    "notes"                TEXT,
    "paid_at"              TIMESTAMP(3),
    "process_instance_id"  TEXT,
    "created_by_id"        TEXT NOT NULL,
    "created_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"           TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id"          TEXT NOT NULL,
    "invoice_id"  TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity"    DECIMAL(10,2) NOT NULL,
    "unit_price"  DECIMAL(18,2) NOT NULL,
    "amount"      DECIMAL(18,2) NOT NULL,
    "tax_rate"    DECIMAL(5,2) NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_code_key" ON "invoices"("code");

-- CreateIndex
CREATE INDEX "idx_invoices_status"      ON "invoices"("status");
CREATE INDEX "idx_invoices_customer_id" ON "invoices"("customer_id");
CREATE INDEX "idx_invoices_project_id"  ON "invoices"("project_id");
CREATE INDEX "idx_invoice_items_invoice_id" ON "invoice_items"("invoice_id");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey"
    FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
