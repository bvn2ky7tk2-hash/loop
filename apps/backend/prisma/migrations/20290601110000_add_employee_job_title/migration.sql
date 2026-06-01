-- AlterTable: thêm chức danh độc lập cho nhân sự
ALTER TABLE "employees" ADD COLUMN "job_title_id" TEXT;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_job_title_id_fkey" FOREIGN KEY ("job_title_id") REFERENCES "job_titles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
