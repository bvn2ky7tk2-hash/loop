-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "max_employees" INTEGER,
ADD COLUMN     "max_projects" INTEGER,
ADD COLUMN     "max_storage_mb" INTEGER,
ADD COLUMN     "max_users" INTEGER,
ADD COLUMN     "storage_used_bytes" BIGINT NOT NULL DEFAULT 0;
