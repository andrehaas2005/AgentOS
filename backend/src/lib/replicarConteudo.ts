import path from "path";
import fs from "fs";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db";

const PASTA_MIDIA = path.join(__dirname, "../../uploads/conteudos");

// Cria uma cópia editável e não publicada de um Conteudo pra outra empresa. Conteudo não
// tem empresaId direto (só via calendarioId -> CalendarioItem.empresaId), então replicar
// exige criar um CalendarioItem novo também. Os arquivos de mídia são copiados fisicamente
// (não só a URL) — agora que excluir mídia é uma ação real, duas linhas de Conteudo
// apontando pro mesmo arquivo em disco fariam a exclusão numa quebrar a outra.
export async function replicarConteudo(
  conteudoId: string,
  destino: { empresaId: string; dataHora: Date },
): Promise<{ id: string; calendarioId: string }> {
  const original = await prisma.conteudo.findUnique({
    where: { id: conteudoId },
    include: { calendario: true },
  });
  if (!original) throw new Error("Conteúdo não encontrado.");

  const empresaDestino = await prisma.empresa.findUnique({ where: { id: destino.empresaId } });
  if (!empresaDestino) throw new Error("Empresa de destino não encontrada.");

  const metadataOriginal = (original.metadata as Record<string, unknown> | null) ?? {};
  const { ultimaRevisao: _ultimaRevisao, ...metadataSemRevisao } = metadataOriginal;

  const novoCalendario = await prisma.calendarioItem.create({
    data: {
      empresaId: destino.empresaId,
      dataHora: destino.dataHora,
      tipoPost: original.calendario.tipoPost,
      briefing: original.calendario.briefing,
      status: "planejado",
      aprovacaoAutomatica: false,
      redesAlvo: original.calendario.redesAlvo,
    },
  });

  let novoConteudo = await prisma.conteudo.create({
    data: {
      calendarioId: novoCalendario.id,
      texto: original.texto,
      midiaUrls: [],
      metadata: metadataSemRevisao as unknown as Prisma.InputJsonValue,
    },
  });

  if (original.midiaUrls.length > 0) {
    const novasUrls: string[] = [];
    for (const urlAntiga of original.midiaUrls) {
      const nomeArquivoAntigo = path.basename(urlAntiga);
      const extensao = path.extname(nomeArquivoAntigo);
      const nomeArquivoNovo = `${novoConteudo.id}-${Date.now()}-${novasUrls.length}${extensao}`;
      try {
        fs.copyFileSync(path.join(PASTA_MIDIA, nomeArquivoAntigo), path.join(PASTA_MIDIA, nomeArquivoNovo));
        novasUrls.push(`/uploads/conteudos/${nomeArquivoNovo}`);
      } catch (erro) {
        console.warn(`Não foi possível copiar o arquivo de mídia ${urlAntiga} na replicação de ${conteudoId}:`, erro);
      }
    }
    if (novasUrls.length > 0) {
      novoConteudo = await prisma.conteudo.update({
        where: { id: novoConteudo.id },
        data: { midiaUrls: { set: novasUrls } },
      });
    }
  }

  return { id: novoConteudo.id, calendarioId: novoCalendario.id };
}
