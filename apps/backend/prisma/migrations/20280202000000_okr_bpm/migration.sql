-- Migration: thêm process_instance_id vào okr_objectives để tích hợp BPM
ALTER TABLE "okr_objectives" ADD COLUMN "process_instance_id" TEXT;
