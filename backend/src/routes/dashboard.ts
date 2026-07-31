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

dashboardRouter.get("/stats", async (req, res) => {
  const empresaId = req.query.empresaId ? String(req.query.empresaId) : undefined;

  const [empresas, postagensAgendadas, publicadasNoMes, alertas, aguardandoAprovacao, ultimaPublicacao] =
    await Promise.all([
      prisma.empresa.count(),
      prisma.calendarioItem.count({
        where: {
          status: { in: ["planejado", "em_producao", "aguardando_aprovacao", "aprovado", "publicando"] },
          empresaId,
        },
      }),
      prisma.publicacao.count({
        where: {
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
          status: "publicado",
          conteudo: empresaId ? { calendario: { empresaId } } : undefined,
        },
      }),
      prisma.calendarioItem.count({ where: { status: "erro", empresaId } }),
      prisma.calendarioItem.count({
        where: { status: "aguardando_aprovacao", aprovacaoAutomatica: false, empresaId },
      }),
      prisma.publicacao.findFirst({
        where: { status: "publicado", conteudo: empresaId ? { calendario: { empresaId } } : undefined },
        include: { conteudo: { include: { calendario: { include: { empresa: true } } } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  res.json({
    empresas,
    agentesConfigurados: AGENTES_DEFINIDOS.length,
    postagensAgendadas,
    publicadasNoMes,
    alertas,
    aguardandoAprovacao,
    ultimaPublicacao,
  });
});

dashboardRouter.get("/aguardando-aprovacao", async (req, res) => {
  const empresaId = req.query.empresaId ? String(req.query.empresaId) : undefined;
  const itens = await prisma.calendarioItem.findMany({
    where: { status: "aguardando_aprovacao", aprovacaoAutomatica: false, empresaId },
    include: {
      empresa: true,
      conteudos: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { dataHora: "asc" },
  });
  res.json(itens);
});

dashboardRouter.get("/eventos", async (req, res) => {
  const empresaId = req.query.empresaId ? String(req.query.empresaId) : undefined;
  const eventos = await prisma.execucaoAgente.findMany({
    where: { empresaId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  res.json(eventos);
});
