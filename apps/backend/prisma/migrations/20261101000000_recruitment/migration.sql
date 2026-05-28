-- CreateEnum
CREATE TYPE "job_status" AS ENUM ('OPEN', 'ON_HOLD', 'CLOSED');

-- CreateEnum
CREATE TYPE "candidate_stage" AS ENUM ('APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "interview_type" AS ENUM ('PHONE', 'TECHNICAL', 'HR', 'FINAL');

-- CreateEnum
CREATE TYPE "interview_result" AS ENUM ('PASS', 'FAIL', 'PENDING');

-- CreateTable
CREATE TABLE "job_openings" (
    "id"           TEXT NOT NULL,
    "code"         TEXT NOT NULL,
    "title"        VARCHAR(200) NOT NULL,
    "org_unit_id"  TEXT NOT NULL,
    "level"        "EmployeeLevel" NOT NULL DEFAULT 'JUNIOR',
    "headcount"    INTEGER NOT NULL DEFAULT 1,
    "status"       "job_status" NOT NULL DEFAULT 'OPEN',
    "requirements" TEXT,
    "salary_from"  DECIMAL(18,2),
    "salary_to"    DECIMAL(18,2),
    "closed_at"    TIMESTAMP(3),
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_openings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id"                   TEXT NOT NULL,
    "name"                 TEXT NOT NULL,
    "email"                TEXT,
    "phone"                TEXT,
    "cv_storage_path"      TEXT,
    "job_opening_id"       TEXT NOT NULL,
    "stage"                "candidate_stage" NOT NULL DEFAULT 'APPLIED',
    "assignee_id"          TEXT,
    "source"               "lead_source",
    "expected_salary"      DECIMAL(18,2),
    "employee_id"          TEXT,
    "process_instance_id"  TEXT,
    "notes"                TEXT,
    "created_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"           TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id"           TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "type"         "interview_type" NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "location"     TEXT,
    "meeting_url"  TEXT,
    "interviewers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "result"       "interview_result" NOT NULL DEFAULT 'PENDING',
    "score"        INTEGER,
    "notes"        TEXT,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_openings_code_key"   ON "job_openings"("code");
CREATE UNIQUE INDEX "candidates_employee_id_key" ON "candidates"("employee_id");

CREATE INDEX "idx_job_openings_org_status"   ON "job_openings"("org_unit_id", "status");
CREATE INDEX "idx_candidates_job_stage"       ON "candidates"("job_opening_id", "stage");
CREATE INDEX "idx_candidates_assignee"        ON "candidates"("assignee_id");
CREATE INDEX "idx_interviews_candidate_id"    ON "interviews"("candidate_id");

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_job_opening_id_fkey"
    FOREIGN KEY ("job_opening_id") REFERENCES "job_openings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "interviews" ADD CONSTRAINT "interviews_candidate_id_fkey"
    FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
