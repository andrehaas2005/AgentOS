import path from "path";
import fs from "fs";
import type { Conteudo } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { gerarUmaImagemBuffer } from "./gerarImagemFallback";
import { gerarUmVideoBuffer } from "./gerarVideoBuffer";
import { gerarJson } from "./llmClient";
import { renderizarCarrosselEducativo, type SlideEducativo } from "./slideRenderer";

const PASTA_MIDIA = path.join(__dirname, "../../uploads/conteudos");

export class RegeneracaoIndisponivelError extends Error {}

export function removerArquivoMidiaDoDisco(urlRelativa: string): void {
  const nomeArquivo = path.basename(urlRelativa);
  fs.unlink(path.join(PASTA_MIDIA, nomeArquivo), () => {});
}

export function ehVideo(urlRelativa: string): boolean {
  return /\.(mp4|mov|webm)$/i.test(urlRelativa);
}

type MetadataConteudo = {
  promptImagem?: string;
  promptImagens?: string[];
  slidesEducativo?: SlideEducativo[];
  roteiroVideo?: string;
  promptVideo?: string;
};

// Reaproveita o prompt já salvo pelo Diretor de Arte/Vídeo (metadata.promptImagem/
// promptImagens/slidesEducativo/promptVideo) pra gerar uma nova versão da mídia num índice
// específico, sem precisar rodar o pipeline inteiro de novo.
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
  } else if (indice === 0 && ehVideo(conteudo.midiaUrls[indice]) && metadata.promptVideo) {
    const buffer = await gerarUmVideoBuffer(metadata.promptVideo);
    if (buffer) {
      const nomeArquivo = `${conteudoId}-regen-${Date.now()}.mp4`;
      fs.writeFileSync(path.join(PASTA_MIDIA, nomeArquivo), buffer);
      novaUrl = `/uploads/conteudos/${nomeArquivo}`;
    }
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
      "Geração de mídia indisponível no momento (provedor de IA falhou). Tente novamente em alguns minutos.",
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

// Pra conteúdo de vídeo criado ANTES do pipeline gerar mídia automaticamente (só tinha o
// roteiro em texto salvo, midiaUrls vazio) — traduz/reformata o roteiro existente num
// promptVideo (inglês, formato Pixverse) e gera o vídeo pela primeira vez.
export async function gerarVideoInicialConteudo(conteudoId: string): Promise<Conteudo> {
  const conteudo = await prisma.conteudo.findUnique({ where: { id: conteudoId } });
  if (!conteudo) throw new Error("Conteúdo não encontrado.");
  if (conteudo.midiaUrls.length > 0) {
    throw new Error("Este conteúdo já tem mídia — use \"gerar novamente\" em vez de gerar inicial.");
  }

  const metadata = (conteudo.metadata as MetadataConteudo | null) ?? {};
  let promptVideo = metadata.promptVideo;

  if (!promptVideo) {
    if (!metadata.roteiroVideo) {
      throw new Error("Nenhum roteiro de vídeo salvo para este conteúdo — não é possível gerar automaticamente.");
    }
    const traducao = await gerarJson<{ promptVideo: string }>(
      `Você traduz roteiros de vídeo em português para o formato de prompt do gerador de vídeo Pixverse.
Descreva 1 a 3 cortes/cenas em inglês, com linguagem de câmera cinematográfica (close-up, wide shot, cut to next
scene), incluindo falas entre aspas quando houver, e uma frase final sobre o áudio esperado (música/efeitos).
Tudo precisa caber em no máximo 10 segundos de vídeo — escolha o gancho mais forte do roteiro. Não inclua texto
on-screen/legendas gráficas.`,
      `Roteiro original em português:\n${metadata.roteiroVideo}`,
      {
        type: "OBJECT",
        properties: { promptVideo: { type: "STRING" } },
        required: ["promptVideo"],
      },
    );
    promptVideo = traducao.promptVideo;
  }

  const buffer = await gerarUmVideoBuffer(promptVideo);
  if (!buffer) {
    throw new RegeneracaoIndisponivelError(
      "Geração de vídeo indisponível no momento (Replicate/Pixverse falhou). Tente novamente em alguns minutos.",
    );
  }

  const nomeArquivo = `${conteudoId}-${Date.now()}.mp4`;
  fs.writeFileSync(path.join(PASTA_MIDIA, nomeArquivo), buffer);
  const novaUrl = `/uploads/conteudos/${nomeArquivo}`;

  const metadataAtualizado = { ...metadata, promptVideo };
  return prisma.conteudo.update({
    where: { id: conteudoId },
    data: {
      midiaUrls: { push: novaUrl },
      metadata: metadataAtualizado as unknown as Prisma.InputJsonValue,
      versao: { increment: 1 },
    },
  });
}
