-- AlterTable
ALTER TABLE "calendario" ADD COLUMN     "aprovacao_automatica" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "conteudos" ADD COLUMN     "aprovado_em" TIMESTAMP(3),
ADD COLUMN     "aprovado_por" TEXT;

-- AlterTable
ALTER TABLE "publicacoes" ADD COLUMN     "link" TEXT;
