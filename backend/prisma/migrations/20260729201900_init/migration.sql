-- CreateEnum
CREATE TYPE "RedeSocial" AS ENUM ('instagram', 'facebook', 'youtube', 'linkedin');

-- CreateEnum
CREATE TYPE "TipoPost" AS ENUM ('imagem_frase', 'carrossel', 'animacao', 'video_curto', 'stories', 'reels', 'post');

-- CreateEnum
CREATE TYPE "StatusCalendario" AS ENUM ('planejado', 'em_producao', 'aguardando_aprovacao', 'aprovado', 'publicado', 'erro');

-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nicho" TEXT,
    "tom_de_voz" TEXT,
    "brand_guidelines" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_sociais" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "rede" "RedeSocial" NOT NULL,
    "credenciais" JSONB,
    "status" TEXT NOT NULL DEFAULT 'desconectado',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contas_sociais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendario" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "data_hora" TIMESTAMP(3) NOT NULL,
    "tipo_post" "TipoPost" NOT NULL,
    "briefing" TEXT,
    "status" "StatusCalendario" NOT NULL DEFAULT 'planejado',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conteudos" (
    "id" TEXT NOT NULL,
    "calendario_id" TEXT NOT NULL,
    "texto" TEXT,
    "midia_urls" TEXT[],
    "metadata" JSONB,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conteudos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publicacoes" (
    "id" TEXT NOT NULL,
    "conteudo_id" TEXT NOT NULL,
    "rede" "RedeSocial" NOT NULL,
    "external_post_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "log" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publicacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execucoes_agentes" (
    "id" TEXT NOT NULL,
    "agente" TEXT NOT NULL,
    "empresa_id" TEXT,
    "entrada" JSONB,
    "saida" JSONB,
    "custo_tokens" INTEGER,
    "duracao_ms" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'sucesso',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "execucoes_agentes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "contas_sociais" ADD CONSTRAINT "contas_sociais_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendario" ADD CONSTRAINT "calendario_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conteudos" ADD CONSTRAINT "conteudos_calendario_id_fkey" FOREIGN KEY ("calendario_id") REFERENCES "calendario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publicacoes" ADD CONSTRAINT "publicacoes_conteudo_id_fkey" FOREIGN KEY ("conteudo_id") REFERENCES "conteudos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
