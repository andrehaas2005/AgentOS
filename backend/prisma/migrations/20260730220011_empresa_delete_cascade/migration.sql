-- DropForeignKey
ALTER TABLE "calendario" DROP CONSTRAINT "calendario_empresa_id_fkey";

-- DropForeignKey
ALTER TABLE "contas_sociais" DROP CONSTRAINT "contas_sociais_empresa_id_fkey";

-- DropForeignKey
ALTER TABLE "conteudos" DROP CONSTRAINT "conteudos_calendario_id_fkey";

-- DropForeignKey
ALTER TABLE "publicacoes" DROP CONSTRAINT "publicacoes_conteudo_id_fkey";

-- AddForeignKey
ALTER TABLE "contas_sociais" ADD CONSTRAINT "contas_sociais_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendario" ADD CONSTRAINT "calendario_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conteudos" ADD CONSTRAINT "conteudos_calendario_id_fkey" FOREIGN KEY ("calendario_id") REFERENCES "calendario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publicacoes" ADD CONSTRAINT "publicacoes_conteudo_id_fkey" FOREIGN KEY ("conteudo_id") REFERENCES "conteudos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
