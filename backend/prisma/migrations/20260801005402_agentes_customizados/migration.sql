-- CreateTable
CREATE TABLE "agentes_customizados" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "origem" TEXT NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agentes_customizados_pkey" PRIMARY KEY ("id")
);
