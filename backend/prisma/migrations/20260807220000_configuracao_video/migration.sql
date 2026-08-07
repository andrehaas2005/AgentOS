-- CreateTable
CREATE TABLE "configuracao_video" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "modelo" TEXT NOT NULL,
    "parametros" JSONB NOT NULL,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracao_video_pkey" PRIMARY KEY ("id")
);
