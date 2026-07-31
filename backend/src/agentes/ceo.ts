import type { Options, SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { NOMES_EXIBICAO, subagentes } from "./definicoes";
import { marcarAtivo, marcarInativo } from "./status";

type SDKResultMessage = Extract<SDKMessage, { type: "result" }>;
type SDKAssistantMessage = Extract<SDKMessage, { type: "assistant" }>;

type SubExecucao = {
  subagentType: string;
  descricao?: string;
  inicioMs: number;
  fimMs: number;
  saida: string;
};

type ConteudoEstruturado = {
  legenda?: string;
  hashtags?: string[];
  cta?: string;
  promptImagem?: string;
  roteiroVideo?: string;
  aprovado?: boolean;
  observacoesRevisor?: string;
};

const TIPOS_QUE_PRECISAM_ARTE = new Set(["imagem_frase", "carrossel", "stories"]);
const TIPOS_QUE_PRECISAM_VIDEO = new Set(["animacao", "video_curto", "reels"]);

function extrairTexto(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return content
    .filter(
      (bloco): bloco is { type: string; text: string } =>
        typeof bloco === "object" &&
        bloco !== null &&
        (bloco as { type?: unknown }).type === "text" &&
        typeof (bloco as { text?: unknown }).text === "string",
    )
    .map((bloco) => bloco.text)
    .join("");
}

function montarPromptCeo(
  item: {
    tipoPost: string;
    dataHora: Date;
    briefing: string | null;
    empresa: { nome: string; nicho: string | null; tomDeVoz: string | null; brandGuidelines: unknown };
  },
  reforcarDelegacao = false,
): string {
  const precisaArte = TIPOS_QUE_PRECISAM_ARTE.has(item.tipoPost);
  const precisaVideo = TIPOS_QUE_PRECISAM_VIDEO.has(item.tipoPost);

  const passosMidia = [
    precisaArte
      ? '3. Delegue ao subagente "diretor-arte" para gerar o prompt descritivo de imagem.'
      : null,
    precisaVideo
      ? '3. Delegue ao subagente "diretor-video" para gerar o roteiro de vídeo.'
      : null,
  ].filter(Boolean);

  const aviso = reforcarDelegacao
    ? `\n\nATENÇÃO — TENTATIVA ANTERIOR REJEITADA: você respondeu diretamente sem usar a ferramenta Task para delegar aos subagentes. Isso é PROIBIDO, mesmo que o post pareça simples. Você é apenas o orquestrador — não escreva ângulo, legenda, hashtags, prompt de imagem/roteiro ou revisão você mesmo. Use a ferramenta Task para acionar CADA subagente listado abaixo, um por um, antes de responder o JSON final.\n`
    : "";

  return `Você é o Agente CEO do AgentOS, responsável por orquestrar a produção do conteúdo de um post.
${aviso}
Empresa: ${item.empresa.nome}
Nicho: ${item.empresa.nicho ?? "não informado"}
Tom de voz: ${item.empresa.tomDeVoz ?? "não informado"}
Guidelines de marca: ${item.empresa.brandGuidelines ? JSON.stringify(item.empresa.brandGuidelines) : "nenhuma definida"}

Item do calendário:
Tipo de post: ${item.tipoPost}
Data/hora planejada: ${item.dataHora.toISOString()}
Briefing: ${item.briefing ?? "nenhum briefing específico — use o nicho da empresa como base"}

Fluxo obrigatório (use a ferramenta Task para cada um destes passos, nunca responda diretamente):
1. Delegue ao subagente "estrategista-conteudo" para definir o ângulo do post.
2. Delegue ao subagente "redator" para escrever a legenda, hashtags e CTA com base no ângulo.
${passosMidia.join("\n")}
${passosMidia.length + 3}. Delegue ao subagente "revisor-marca" para revisar o conteúdo final contra as guidelines.
${passosMidia.length + 4}. Só então responda no formato JSON pedido, consolidando tudo que os subagentes produziram.

Não publique nada e não gere mídia de verdade — apenas texto/JSON.`;
}

type TentativaCeo = {
  subExecucoes: Map<string, SubExecucao>;
  resultadoFinal: SDKResultMessage | undefined;
  duracaoMs: number;
};

async function rodarTentativaCeo(
  item: Awaited<ReturnType<typeof prisma.calendarioItem.findUnique>> & {
    empresa: { nome: string; nicho: string | null; tomDeVoz: string | null; brandGuidelines: unknown };
  },
  reforcarDelegacao: boolean,
): Promise<TentativaCeo> {
  const { query } = await import("@anthropic-ai/claude-agent-sdk");

  const options: Options = {
    systemPrompt:
      "Você é o Agente CEO: orquestra os subagentes especializados para produzir o conteúdo de um post de rede social. Sempre delegue cada etapa ao subagente certo, usando a ferramenta Task — nunca escreva o conteúdo final você mesmo.",
    tools: ["Task"],
    allowedTools: ["Task"],
    permissionMode: "dontAsk",
    agents: subagentes,
    model: "sonnet",
    outputFormat: {
      type: "json_schema",
      schema: {
        type: "object",
        properties: {
          legenda: { type: "string" },
          hashtags: { type: "array", items: { type: "string" } },
          cta: { type: "string" },
          promptImagem: { type: "string" },
          roteiroVideo: { type: "string" },
          aprovado: { type: "boolean" },
          observacoesRevisor: { type: "string" },
        },
        required: ["legenda", "hashtags", "aprovado"],
      },
    },
  };

  const subExecucoes = new Map<string, SubExecucao>();
  let resultadoFinal: SDKResultMessage | undefined;
  const inicioGeral = Date.now();

  marcarAtivo("CEO", `Executando ${item.tipoPost}`);
  try {
    for await (const message of query({ prompt: montarPromptCeo(item, reforcarDelegacao), options })) {
      if (message.type === "assistant") {
        const assistente = message as SDKAssistantMessage;
        if (assistente.parent_tool_use_id) {
          const chave = assistente.parent_tool_use_id;
          const texto = extrairTexto((assistente.message as { content?: unknown }).content);
          const existente = subExecucoes.get(chave);
          if (existente) {
            existente.saida += texto;
            existente.fimMs = Date.now();
          } else {
            const nomeExibicao = NOMES_EXIBICAO[assistente.subagent_type ?? ""] ?? assistente.subagent_type;
            subExecucoes.set(chave, {
              subagentType: assistente.subagent_type ?? "desconhecido",
              descricao: assistente.task_description,
              inicioMs: Date.now(),
              fimMs: Date.now(),
              saida: texto,
            });
            if (nomeExibicao) marcarAtivo(nomeExibicao, assistente.task_description);
          }
        }
      }
      if (message.type === "result") {
        resultadoFinal = message as SDKResultMessage;
      }
    }
  } finally {
    marcarInativo("CEO");
    for (const exec of subExecucoes.values()) {
      marcarInativo(NOMES_EXIBICAO[exec.subagentType] ?? exec.subagentType);
    }
  }

  return { subExecucoes, resultadoFinal, duracaoMs: Date.now() - inicioGeral };
}

export async function executarAgenteCeo(calendarioItemId: string) {
  const item = await prisma.calendarioItem.findUnique({
    where: { id: calendarioItemId },
    include: { empresa: true },
  });
  if (!item) throw new Error("Item de calendário não encontrado");

  let tentativa = await rodarTentativaCeo(item, false);

  // O CEO às vezes ignora a instrução de delegar e responde diretamente, sem acionar
  // nenhum subagente — pulando a revisão de marca e deixando o board sem atividade.
  // Uma segunda tentativa com a instrução reforçada resolve a grande maioria dos casos.
  if (tentativa.subExecucoes.size === 0) {
    console.warn(
      `Agente CEO respondeu sem delegar a nenhum subagente (calendarioItemId=${calendarioItemId}) — repetindo com instrução reforçada.`,
    );
    tentativa = await rodarTentativaCeo(item, true);
  }

  const { subExecucoes, resultadoFinal, duracaoMs } = tentativa;

  if (!resultadoFinal) {
    await prisma.execucaoAgente.create({
      data: {
        agente: "CEO",
        empresaId: item.empresaId,
        entrada: { calendarioItemId, tipoPost: item.tipoPost, briefing: item.briefing },
        saida: { erro: "Nenhuma mensagem de resultado recebida do SDK" },
        duracaoMs,
        status: "erro",
      },
    });
    throw new Error("O Agente CEO não retornou um resultado final");
  }

  for (const exec of subExecucoes.values()) {
    await prisma.execucaoAgente.create({
      data: {
        agente: NOMES_EXIBICAO[exec.subagentType] ?? exec.subagentType,
        empresaId: item.empresaId,
        entrada: { descricao: exec.descricao ?? null },
        saida: { texto: exec.saida },
        duracaoMs: Math.max(exec.fimMs - exec.inicioMs, 0),
        status: "sucesso",
      },
    });
  }

  if (resultadoFinal.subtype !== "success") {
    await prisma.execucaoAgente.create({
      data: {
        agente: "CEO",
        empresaId: item.empresaId,
        entrada: { calendarioItemId, tipoPost: item.tipoPost, briefing: item.briefing },
        saida: { erro: resultadoFinal.errors },
        duracaoMs: resultadoFinal.duration_ms,
        status: "erro",
      },
    });
    throw new Error(`Execução do Agente CEO falhou: ${resultadoFinal.subtype}`);
  }

  const estruturado = resultadoFinal.structured_output as ConteudoEstruturado | undefined;

  await prisma.execucaoAgente.create({
    data: {
      agente: "CEO",
      empresaId: item.empresaId,
      entrada: { calendarioItemId, tipoPost: item.tipoPost, briefing: item.briefing },
      saida: { resultado: resultadoFinal.result, estruturado: estruturado ?? null },
      custoTokens: resultadoFinal.usage.input_tokens + resultadoFinal.usage.output_tokens,
      duracaoMs: resultadoFinal.duration_ms,
      status: "sucesso",
    },
  });

  const conteudo = await prisma.conteudo.create({
    data: {
      calendarioId: item.id,
      texto: estruturado?.legenda ?? resultadoFinal.result,
      midiaUrls: [],
      metadata: (estruturado ?? {}) as unknown as Prisma.InputJsonValue,
    },
  });

  await prisma.calendarioItem.update({
    where: { id: item.id },
    data: { status: "aguardando_aprovacao" },
  });

  return {
    conteudo,
    execucoes: subExecucoes.size + 1,
    custoUsd: resultadoFinal.total_cost_usd,
  };
}
