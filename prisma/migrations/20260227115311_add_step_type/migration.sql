-- AlterTable
ALTER TABLE "workflow_steps" ADD COLUMN     "requiresDocuments" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'input';
