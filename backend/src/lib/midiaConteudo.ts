import path from "path";
import fs from "fs";
import type { Conteudo } from "@prisma/client";
import { prisma } from "../db";
import { gerarUmaImagemBuffer } from "./gerarImagemFallback";
import { renderizarCarrosselEducativo, type SlideEducativo } from "./slideRenderer";

const PASTA_MIDIA = path.join(__dirname, "../../uploads/conteudos");

export class RegeneracaoIndisponivelError extends Error {}

export function removerArquivoMidiaDoDisco(urlRelativa: string): void {
  const nomeArquivo = path.basename(urlRelativa);
  fs.unlink(path.join(PASTA_MIDIA, nomeArquivo), () => {});
}

type MetadataConteudo = {
  promptImagem?: string;
  promptImagens?: string[];
  slidesEducativo?: SlideEducativo[];
};

// Reaproveita o prompt já salvo pelo Diretor de Arte (metadata.promptImagem/promptImagens/
// slidesEducativo) pra gerar uma nova versão da mídia num índice específico, sem precisar
// rodar o pipeline inteiro de novo.
export async function regenerarMidiaConteudo(conteudoId: string, indice: number): Promise<Conteudo> {
  const conteudo = await prisma.conteudo.findUnique({
    where: { id: conteudoId },
    include: { calendario: { include: { empresa: true } } },
  });
  if (!conteudo) throw new Error("Conteúdo não encontrado.");
  if (indice >= conteudo.midiaUrls.length) throw new Error("Índice de mídia fora do intervalo.");

  const metadata = (conteudo.metadata as MetadataConteudo | null) ?? {};
  const empresa = conteudo.calendario.empresa;

  let novaUrl: string | null = null;

  const slideEducativo = metadata.slidesEducativo?.[indice];
  if (slideEducativo) {
    const urls = await renderizarCarrosselEducativo(conteudoId, empresa, [slideEducativo]);
    novaUrl = urls[0] ?? null;
  } else {
    const prompt = metadata.promptImagens?.[indice] ?? (indice === 0 ? metadata.promptImagem : undefined);
    if (!prompt) {
      throw new Error("Nenhum prompt salvo para essa mídia — não é possível gerar novamente com IA.");
    }
    const buffer = await gerarUmaImagemBuffer(prompt);
    if (buffer) {
      const nomeArquivo = `${conteudoId}-regen-${Date.now()}.jpg`;
      fs.writeFileSync(path.join(PASTA_MIDIA, nomeArquivo), buffer);
      novaUrl = `/uploads/conteudos/${nomeArquivo}`;
    }
  }

  if (!novaUrl) {
    throw new RegeneracaoIndisponivelError(
      "Geração de imagem indisponível no momento (Replicate e Gemini falharam). Tente novamente em alguns minutos.",
    );
  }

  const urlAntiga = conteudo.midiaUrls[indice];
  const midiaUrls = [...conteudo.midiaUrls];
  midiaUrls[indice] = novaUrl;

  const atualizado = await prisma.conteudo.update({
    where: { id: conteudoId },
    data: { midiaUrls: { set: midiaUrls }, versao: { increment: 1 } },
  });
  removerArquivoMidiaDoDisco(urlAntiga);
  return atualizado;
}
