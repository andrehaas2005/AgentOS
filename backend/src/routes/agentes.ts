import { Router } from "express";
import { prisma } from "../db";
import { obterAtivos } from "../agentes/status";
import { NOMES_EXIBICAO, subagentes } from "../agentes/definicoes";

export const agentesRouter = Router();

// CEO e Publicador não têm prompt de LLM — o CEO orquestra (código determinístico) e o
// Publicador só chama as APIs das redes — por isso ficam com "prompt: null" aqui.
const FUNCAO_SEM_PROMPT: Record<string, string> = {
  CEO: "Orquestra o time: decide a ordem das etapas, dispara cada subagente e decide o que produzir/publicar. Não usa prompt de LLM fixo — a lógica de orquestração é código determinístico.",
  Publicador: "Publica o conteúdo aprovado na rede certa (Instagram, LinkedIn) chamando as APIs de cada rede diretamente. Não usa prompt de LLM — é uma ação determinística de código.",
};

agentesRouter.get("/definicoes", (_req, res) => {
  const doPipeline = Object.entries(subagentes).map(([id, def]) => ({
    nome: NOMES_EXIBICAO[id] ?? id,
    descricao: def.description,
    prompt: def.prompt,
  }));
  const semPrompt = Object.entries(FUNCAO_SEM_PROMPT).map(([nome, descricao]) => ({
    nome,
    descricao,
    prompt: null,
  }));
  res.json([semPrompt[0], ...doPipeline, semPrompt[1]]);
});

agentesRouter.get("/status", (_req, res) => {
  const ativos = Array.from(obterAtivos().entries()).map(([agente, info]) => ({
    agente,
    desde: new Date(info.desde).toISOString(),
    descricao: info.descricao ?? null,
  }));
  res.json(ativos);
});

agentesRouter.get("/:nome/timeline", async (req, res) => {
  const execucoes = await prisma.execucaoAgente.findMany({
    where: { agente: req.params.nome },
    orderBy: { createdAt: "desc" },
    take: 15,
  });
  res.json(execucoes);
});

agentesRouter.get("/", async (req, res) => {
  const empresaId = req.query.empresaId ? String(req.query.empresaId) : undefined;

  const grupos = await prisma.execucaoAgente.groupBy({
    by: ["agente"],
    where: { empresaId },
    _count: { _all: true },
    _sum: { custoTokens: true },
    _avg: { duracaoMs: true },
  });

  const ultimas = await prisma.execucaoAgente.findMany({
    where: { empresaId },
    distinct: ["agente"],
    orderBy: { createdAt: "desc" },
    select: { agente: true, status: true, createdAt: true },
  });
  const ultimaPorAgente = new Map(ultimas.map((u) => [u.agente, u]));

  const stats = grupos.map((grupo) => ({
    agente: grupo.agente,
    totalExecucoes: grupo._count._all,
    custoTokensTotal: grupo._sum.custoTokens ?? 0,
    duracaoMsMedia: grupo._avg.duracaoMs ? Math.round(grupo._avg.duracaoMs) : null,
    ultimaExecucao: ultimaPorAgente.get(grupo.agente) ?? null,
  }));

  res.json(stats);
});
