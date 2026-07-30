import { Router } from "express";
import { prisma } from "../db";
import { obterAtivos } from "../agentes/status";

export const agentesRouter = Router();

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

agentesRouter.get("/", async (_req, res) => {
  const grupos = await prisma.execucaoAgente.groupBy({
    by: ["agente"],
    _count: { _all: true },
    _sum: { custoTokens: true },
    _avg: { duracaoMs: true },
  });

  const ultimas = await prisma.execucaoAgente.findMany({
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
