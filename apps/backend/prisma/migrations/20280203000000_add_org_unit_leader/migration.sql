-- AlterTable: add leader_id to org_units if not exists
ALTER TABLE "org_units" ADD COLUMN IF NOT EXISTS "leader_id" TEXT;

-- AddForeignKey
ALTER TABLE "org_units" ADD CONSTRAINT "org_units_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
