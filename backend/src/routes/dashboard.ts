import { Router } from "express";
import { prisma } from "../db";

export const dashboardRouter = Router();

const AGENTES_DEFINIDOS = [
  "CEO",
  "Estrategista de Conteúdo",
  "Redator",
  "Diretor de Arte",
  "Diretor de Vídeo",
  "Revisor de Marca",
  "Publicador",
];

dashboardRouter.get("/stats", async (_req, res) => {
  const [empresas, postagensAgendadas, publicadasNoMes, alertas] = await Promise.all([
    prisma.empresa.count(),
    prisma.calendarioItem.count({ where: { status: { in: ["planejado", "em_producao", "aguardando_aprovacao", "aprovado"] } } }),
    prisma.publicacao.count({
      where: { createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }, status: "publicado" },
    }),
    prisma.calendarioItem.count({ where: { status: "erro" } }),
  ]);

  res.json({
    empresas,
    agentesConfigurados: AGENTES_DEFINIDOS.length,
    postagensAgendadas,
    publicadasNoMes,
    alertas,
  });
});

dashboardRouter.get("/eventos", async (_req, res) => {
  const eventos = await prisma.execucaoAgente.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  res.json(eventos);
});
