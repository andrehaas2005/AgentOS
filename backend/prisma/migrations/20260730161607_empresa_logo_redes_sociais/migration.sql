-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RedeSocial" ADD VALUE 'tiktok';
ALTER TYPE "RedeSocial" ADD VALUE 'blog';
ALTER TYPE "RedeSocial" ADD VALUE 'outro';

-- AlterTable
ALTER TABLE "contas_sociais" ADD COLUMN     "rotulo_custom" TEXT;

-- AlterTable
ALTER TABLE "empresas" ADD COLUMN     "logo_url" TEXT;
