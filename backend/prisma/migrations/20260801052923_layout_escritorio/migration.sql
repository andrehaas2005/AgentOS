-- CreateTable
CREATE TABLE "layout_escritorio" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "dados" JSONB NOT NULL,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "layout_escritorio_pkey" PRIMARY KEY ("id")
);
