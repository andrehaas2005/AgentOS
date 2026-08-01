import path from "path";
import fs from "fs";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { NOMES_EXIBICAO, subagentes } from "./definicoes";
import { marcarAtivo, marcarInativo } from "./status";
import { gerarImagem } from "../lib/geminiClient";
import { gerarTexto, gerarJson } from "../lib/llmClient";
import { gerarImagemReplicate } from "../lib/replicateClient";

const TIPOS_QUE_PRECISAM_ARTE = new Set(["imagem_frase", "carrossel", "stories"]);
const TIPOS_QUE_PRECISAM_VIDEO = new Set(["animacao", "video_curto", "reels"]);

const PASTA_MIDIA = path.join(__dirname, "../../uploads/conteudos");
fs.mkdirSync(PASTA_MIDIA, { recursive: true });

type ItemComEmpresa = {
  id: string;
  empresaId: string;
  tipoPost: string;
  dataHora: Date;
  briefing: string | null;
  empresa: { nome: string; nicho: string | null; tomDeVoz: string | null; brandGuidelines: unknown };
};

type ConteudoEstruturado = {
  legenda: string;
  hashtags: string[];
  cta: string;
  promptImagem?: string;
  roteiroVideo?: string;
  aprovado: boolean;
  observacoesRevisor: string;
};

async function rodarEtapa<T>(
  agente: string,
  empresaId: string,
  descricao: string,
  executar: () => Promise<T>,
): Promise<T> {
  const nomeExibicao = NOMES_EXIBICAO[agente] ?? agente;
  const inicio = Date.now();
  marcarAtivo(nomeExibicao, descricao);
  try {
    const resultado = await executar();
    await prisma.execucaoAgente.create({
      data: {
        agente: nomeExibicao,
        empresaId,
        entrada: { descricao },
        saida: { texto: typeof resultado === "string" ? resultado : JSON.stringify(resultado) },
        duracaoMs: Date.now() - inicio,
        status: "sucesso",
      },
    });
    return resultado;
  } catch (erro) {
    await prisma.execucaoAgente.create({
      data: {
        agente: nomeExibicao,
        empresaId,
        entrada: { descricao },
        saida: { erro: erro instanceof Error ? erro.message : String(erro) },
        duracaoMs: Date.now() - inicio,
        status: "erro",
      },
    });
    throw erro;
  } finally {
    marcarInativo(nomeExibicao);
  }
}

function contextoEmpresa(item: ItemComEmpresa): string {
  return `Empresa: ${item.empresa.nome}
Nicho: ${item.empresa.nicho ?? "não informado"}
Tom de voz: ${item.empresa.tomDeVoz ?? "não informado"}
Guidelines de marca: ${item.empresa.brandGuidelines ? JSON.stringify(item.empresa.brandGuidelines) : "nenhuma definida"}

Tipo de post: ${item.tipoPost}
Data/hora planejada: ${item.dataHora.toISOString()}
Briefing: ${item.briefing ?? "nenhum briefing específico — use o nicho da empresa como base"}`;
}

async function gerarImagemDoPost(conteudoId: string, promptImagem: string): Promise<string | null> {
  const promptFinal = `${promptImagem}\n\nA imagem deve ser fotorrealista e visualmente atraente (pessoas, natureza, ambientes reais), não um gráfico de texto genérico.`;
  const nomeArquivo = `${conteudoId}-${Date.now()}.jpg`;

  let buffer: Buffer | null = null;
  try {
    buffer = await gerarImagemReplicate(promptFinal);
  } catch (erroReplicate) {
    console.warn(`Geração de imagem via Replicate falhou, tentando Gemini: ${erroReplicate}`);
    try {
      buffer = await gerarImagem(promptFinal);
    } catch (erroGemini) {
      console.warn(`Geração de imagem via Gemini também falhou (post seguirá sem mídia automática): ${erroGemini}`);
      return null;
    }
  }

  fs.writeFileSync(path.join(PASTA_MIDIA, nomeArquivo), buffer);
  return `/uploads/conteudos/${nomeArquivo}`;
}

export async function executarAgenteCeo(calendarioItemId: string) {
  const item = await prisma.calendarioItem.findUnique({
    where: { id: calendarioItemId },
    include: { empresa: true },
  });
  if (!item) throw new Error("Item de calendário não encontrado");

  const precisaArte = TIPOS_QUE_PRECISAM_ARTE.has(item.tipoPost);
  const precisaVideo = TIPOS_QUE_PRECISAM_VIDEO.has(item.tipoPost);
  const contexto = contextoEmpresa(item);
  const inicioGeral = Date.now();

  marcarAtivo("CEO", `Orquestrando ${item.tipoPost}`);
  try {
    const angulo = await rodarEtapa("estrategista-conteudo", item.empresaId, "Definir ângulo do post", () =>
      gerarTexto(
        subagentes["estrategista-conteudo"].prompt,
        `${contexto}\n\nDefina o ângulo/tema central deste post.`,
      ),
    );

    const conteudoRedator = await rodarEtapa<{ legenda: string; hashtags: string[]; cta: string }>(
      "redator",
      item.empresaId,
      "Escrever legenda, hashtags e CTA",
      () =>
        gerarJson(
          subagentes.redator.prompt,
          `${contexto}\n\nÂngulo definido pelo Estrategista de Conteúdo:\n${angulo}\n\nEscreva a legenda final, as hashtags e o CTA.`,
          {
            type: "OBJECT",
            properties: {
              legenda: { type: "STRING" },
              hashtags: { type: "ARRAY", items: { type: "STRING" } },
              cta: { type: "STRING" },
            },
            required: ["legenda", "hashtags", "cta"],
          },
        ),
    );

    let promptImagem: string | undefined;
    let roteiroVideo: string | undefined;

    if (precisaArte) {
      const conteudoArte = await rodarEtapa<{ promptImagem: string }>(
        "diretor-arte",
        item.empresaId,
        "Gerar prompt descritivo de imagem",
        () =>
          gerarJson(
            subagentes["diretor-arte"].prompt,
            `${contexto}\n\nÂngulo: ${angulo}\n\nLegenda: ${conteudoRedator.legenda}\n\nDescreva a peça visual (fotorrealista, com pessoas/natureza/ambientes reais quando fizer sentido para o nicho) e gere o prompt descritivo em inglês.`,
            {
              type: "OBJECT",
              properties: { promptImagem: { type: "STRING" } },
              required: ["promptImagem"],
            },
          ),
      );
      promptImagem = conteudoArte.promptImagem;
    }

    if (precisaVideo) {
      roteiroVideo = await rodarEtapa("diretor-video", item.empresaId, "Gerar roteiro de vídeo", () =>
        gerarTexto(
          subagentes["diretor-video"].prompt,
          `${contexto}\n\nÂngulo: ${angulo}\n\nLegenda: ${conteudoRedator.legenda}\n\nEscreva o roteiro do vídeo/reels.`,
        ),
      );
    }

    const revisao = await rodarEtapa<{
      aprovado: boolean;
      observacoes: string;
      legendaFinal: string;
      hashtagsFinal: string[];
      ctaFinal: string;
    }>("revisor-marca", item.empresaId, "Revisar conteúdo final contra guidelines", () =>
      gerarJson(
        subagentes["revisor-marca"].prompt,
        `${contexto}\n\nConteúdo final produzido:\nLegenda: ${conteudoRedator.legenda}\nHashtags: ${conteudoRedator.hashtags.join(" ")}\nCTA: ${conteudoRedator.cta}\n${promptImagem ? `Prompt de imagem: ${promptImagem}\n` : ""}${roteiroVideo ? `Roteiro de vídeo: ${roteiroVideo}\n` : ""}\nValide se está alinhado às guidelines. Se precisar de ajustes, já aplique-os e devolva a versão final corrigida.`,
        {
          type: "OBJECT",
          properties: {
            aprovado: { type: "BOOLEAN" },
            observacoes: { type: "STRING" },
            legendaFinal: { type: "STRING" },
            hashtagsFinal: { type: "ARRAY", items: { type: "STRING" } },
            ctaFinal: { type: "STRING" },
          },
          required: ["aprovado", "observacoes", "legendaFinal", "hashtagsFinal", "ctaFinal"],
        },
      ),
    );

    const estruturado: ConteudoEstruturado = {
      legenda: revisao.legendaFinal,
      hashtags: revisao.hashtagsFinal,
      cta: revisao.ctaFinal,
      promptImagem,
      roteiroVideo,
      aprovado: revisao.aprovado,
      observacoesRevisor: revisao.observacoes,
    };

    await prisma.execucaoAgente.create({
      data: {
        agente: "CEO",
        empresaId: item.empresaId,
        entrada: { calendarioItemId, tipoPost: item.tipoPost, briefing: item.briefing },
        saida: { estruturado },
        duracaoMs: Date.now() - inicioGeral,
        status: "sucesso",
      },
    });

    const conteudo = await prisma.conteudo.create({
      data: {
        calendarioId: item.id,
        texto: estruturado.legenda,
        midiaUrls: [],
        metadata: estruturado as unknown as Prisma.InputJsonValue,
      },
    });

    if (precisaArte && promptImagem) {
      const midiaUrl = await gerarImagemDoPost(conteudo.id, promptImagem);
      if (midiaUrl) {
        await prisma.conteudo.update({ where: { id: conteudo.id }, data: { midiaUrls: { push: midiaUrl } } });
      }
    }

    await prisma.calendarioItem.update({
      where: { id: item.id },
      data: { status: "aguardando_aprovacao" },
    });

    return { conteudo, execucoes: precisaArte || precisaVideo ? 5 : 4 };
  } catch (erro) {
    await prisma.execucaoAgente.create({
      data: {
        agente: "CEO",
        empresaId: item.empresaId,
        entrada: { calendarioItemId, tipoPost: item.tipoPost, briefing: item.briefing },
        saida: { erro: erro instanceof Error ? erro.message : String(erro) },
        duracaoMs: Date.now() - inicioGeral,
        status: "erro",
      },
    });
    throw erro;
  } finally {
    marcarInativo("CEO");
  }
}
