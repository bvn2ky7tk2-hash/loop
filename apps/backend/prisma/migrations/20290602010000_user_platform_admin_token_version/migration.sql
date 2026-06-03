-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_platform_admin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "token_version" INTEGER NOT NULL DEFAULT 0;
