-- CreateTable
CREATE TABLE "skills_agentes" (
    "chave" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "descricao_padrao" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "prompt_padrao" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_agentes_pkey" PRIMARY KEY ("chave")
);
