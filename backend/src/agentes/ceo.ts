import path from "path";
import fs from "fs";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { NOMES_EXIBICAO, subagentes } from "./definicoes";
import { marcarAtivo, marcarInativo } from "./status";
import { gerarTexto, gerarJson } from "../lib/llmClient";
import { gerarUmaImagemBuffer } from "../lib/gerarImagemFallback";
import { renderizarCarrosselEducativo, type SlideEducativo } from "../lib/slideRenderer";

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
  empresa: { nome: string; nicho: string | null; tomDeVoz: string | null; brandGuidelines: unknown; logoUrl: string | null };
};

type ConteudoEstruturado = {
  legenda: string;
  hashtags: string[];
  cta: string;
  promptImagem?: string;
  promptImagens?: string[];
  slidesEducativo?: SlideEducativo[];
  roteiroVideo?: string;
  aprovado: boolean;
  observacoesRevisor: string;
  notasAgentesCustomizados?: { agente: string; nota: string }[];
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

function resumoSlidesEducativo(slides: SlideEducativo[]): string {
  return `Slides do carrossel educativo (${slides.length}, em ordem):\n${slides
    .map((s, i) => {
      if (s.tipo === "passo") return `${i + 1}. [passo] ${s.badge ?? ""} ${s.titulo} — ${s.texto ?? ""}`;
      if (s.tipo === "capa") return `${i + 1}. [capa] ${s.titulo} — ${(s.bullets ?? []).join(", ")}`;
      return `${i + 1}. [fechamento] ${s.titulo}`;
    })
    .join("\n")}\n`;
}

async function gerarImagemDoPost(conteudoId: string, promptImagem: string): Promise<string | null> {
  const buffer = await gerarUmaImagemBuffer(promptImagem);
  if (!buffer) return null;
  const nomeArquivo = `${conteudoId}-${Date.now()}.jpg`;
  fs.writeFileSync(path.join(PASTA_MIDIA, nomeArquivo), buffer);
  return `/uploads/conteudos/${nomeArquivo}`;
}

// Gera uma imagem por prompt, em ordem — cada slide do carrossel precisa manter a
// sequência em que o Diretor de Arte desenhou a narrativa (gancho → ... → CTA).
// Slides que falharem na geração são pulados (não travam o carrossel inteiro).
async function gerarImagensCarrossel(conteudoId: string, prompts: string[]): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < prompts.length; i++) {
    const buffer = await gerarUmaImagemBuffer(prompts[i]);
    if (!buffer) {
      console.warn(`Slide ${i + 1}/${prompts.length} do carrossel ${conteudoId} não pôde ser gerado — pulando.`);
      continue;
    }
    const nomeArquivo = `${conteudoId}-slide${i + 1}-${Date.now()}.jpg`;
    fs.writeFileSync(path.join(PASTA_MIDIA, nomeArquivo), buffer);
    urls.push(`/uploads/conteudos/${nomeArquivo}`);
  }
  return urls;
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
          { empresaId: item.empresaId },
        ),
    );

    // Defensivo: os provedores de fallback (OpenAI/Anthropic) não têm enforcement real
    // de schema como o Gemini — se o modelo esquecer um campo, evita que isso derrube o
    // pipeline inteiro mais adiante (ex: .join() num hashtags undefined).
    conteudoRedator.hashtags = conteudoRedator.hashtags ?? [];

    let promptImagem: string | undefined;
    let promptImagens: string[] | undefined;
    let slidesEducativo: SlideEducativo[] | undefined;
    let roteiroVideo: string | undefined;

    if (item.tipoPost === "carrossel") {
      const conteudoArte = await rodarEtapa<{
        estilo?: string;
        promptImagens?: string[];
        slides?: SlideEducativo[];
      }>(
        "diretor-arte",
        item.empresaId,
        "Definir estilo e conteúdo visual do carrossel",
        () =>
          gerarJson(
            subagentes["diretor-arte"].prompt,
            `${contexto}\n\nÂngulo: ${angulo}\n\nLegenda: ${conteudoRedator.legenda}\n\nEste post é um CARROSSEL do Instagram. Escolha o estilo ("narrativo" ou "educativo") e produza o conteúdo correspondente.`,
            {
              type: "OBJECT",
              properties: {
                estilo: { type: "STRING" },
                promptImagens: { type: "ARRAY", items: { type: "STRING" } },
                slides: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      tipo: { type: "STRING" },
                      badge: { type: "STRING" },
                      titulo: { type: "STRING" },
                      texto: { type: "STRING" },
                      bullets: { type: "ARRAY", items: { type: "STRING" } },
                      icone: { type: "STRING" },
                      promptFoto: { type: "STRING" },
                    },
                    required: ["tipo", "titulo"],
                  },
                },
              },
              required: ["estilo"],
            },
            { empresaId: item.empresaId },
          ),
      );

      if (conteudoArte.estilo === "educativo" && conteudoArte.slides && conteudoArte.slides.length > 0) {
        slidesEducativo = conteudoArte.slides;
      } else {
        // Defensivo: fallback providers (OpenAI/Anthropic) podem devolver o array vazio.
        promptImagens = conteudoArte.promptImagens && conteudoArte.promptImagens.length > 0
          ? conteudoArte.promptImagens
          : undefined;
      }
    } else if (precisaArte) {
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
            { empresaId: item.empresaId },
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
        `${contexto}\n\nConteúdo final produzido:\nLegenda: ${conteudoRedator.legenda}\nHashtags: ${conteudoRedator.hashtags.join(" ")}\nCTA: ${conteudoRedator.cta}\n${promptImagem ? `Prompt de imagem: ${promptImagem}\n` : ""}${promptImagens ? `Prompts das imagens do carrossel (${promptImagens.length} slides, em ordem):\n${promptImagens.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n` : ""}${slidesEducativo ? resumoSlidesEducativo(slidesEducativo) : ""}${roteiroVideo ? `Roteiro de vídeo: ${roteiroVideo}\n` : ""}\nValide se está alinhado às guidelines. Se precisar de ajustes, já aplique-os e devolva a versão final corrigida.`,
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
        { empresaId: item.empresaId },
      ),
    );

    const estruturado: ConteudoEstruturado = {
      legenda: revisao.legendaFinal,
      hashtags: revisao.hashtagsFinal ?? conteudoRedator.hashtags,
      cta: revisao.ctaFinal,
      promptImagem,
      promptImagens,
      slidesEducativo,
      roteiroVideo,
      aprovado: revisao.aprovado,
      observacoesRevisor: revisao.observacoes,
    };

    // Agentes customizados (criados manualmente ou pelo CEO) rodam depois do time fixo,
    // recebendo o conteúdo final já pronto — contribuem com uma nota própria conforme a
    // função deles, sem alterar legenda/hashtags/cta que já passaram pelo Revisor de Marca.
    const agentesCustomizados = await prisma.agenteCustomizado.findMany({
      where: { ativo: true },
      orderBy: { createdAt: "asc" },
    });
    if (agentesCustomizados.length > 0) {
      const notas: { agente: string; nota: string }[] = [];
      for (const agenteCustom of agentesCustomizados) {
        try {
          const nota = await rodarEtapa(agenteCustom.nome, item.empresaId, `Executando ${agenteCustom.nome}`, () =>
            gerarTexto(
              agenteCustom.prompt,
              `${contexto}\n\nConteúdo final produzido pelo time:\nLegenda: ${estruturado.legenda}\nHashtags: ${estruturado.hashtags.join(" ")}\nCTA: ${estruturado.cta}\n${promptImagem ? `Prompt de imagem: ${promptImagem}\n` : ""}${promptImagens ? `Prompts das imagens do carrossel (${promptImagens.length} slides):\n${promptImagens.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n` : ""}${slidesEducativo ? resumoSlidesEducativo(slidesEducativo) : ""}${roteiroVideo ? `Roteiro de vídeo: ${roteiroVideo}\n` : ""}\nDê sua contribuição conforme a sua função.`,
            ),
          );
          notas.push({ agente: agenteCustom.nome, nota });
        } catch (erro) {
          console.error(`Agente customizado ${agenteCustom.nome} falhou:`, erro);
        }
      }
      if (notas.length > 0) estruturado.notasAgentesCustomizados = notas;
    }

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

    if (slidesEducativo && slidesEducativo.length > 0) {
      const midiaUrls = await renderizarCarrosselEducativo(conteudo.id, item.empresa, slidesEducativo);
      if (midiaUrls.length > 0) {
        await prisma.conteudo.update({ where: { id: conteudo.id }, data: { midiaUrls: { push: midiaUrls } } });
      }
    } else if (promptImagens && promptImagens.length > 0) {
      const midiaUrls = await gerarImagensCarrossel(conteudo.id, promptImagens);
      if (midiaUrls.length > 0) {
        await prisma.conteudo.update({ where: { id: conteudo.id }, data: { midiaUrls: { push: midiaUrls } } });
      }
    } else if (precisaArte && promptImagem) {
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
