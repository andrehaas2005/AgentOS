import { Router } from "express";
import { prisma } from "../db";

export const publicacoesRouter = Router();

publicacoesRouter.get("/", async (_req, res) => {
  const publicacoes = await prisma.publicacao.findMany({
    include: { conteudo: { include: { calendario: { include: { empresa: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(publicacoes);
});
