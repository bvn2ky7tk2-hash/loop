-- AlterTable: cờ loại nghỉ có trừ vào phép năm hay không
ALTER TABLE "leave_types" ADD COLUMN "deducts_annual_leave" BOOLEAN NOT NULL DEFAULT false;
