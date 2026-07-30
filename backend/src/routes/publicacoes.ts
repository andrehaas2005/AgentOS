import { Router } from "express";
import type { RedeSocial } from "@prisma/client";
import { prisma } from "../db";

export const publicacoesRouter = Router();

publicacoesRouter.get("/", async (req, res) => {
  const { empresaId, rede } = req.query;
  const publicacoes = await prisma.publicacao.findMany({
    where: {
      rede: rede ? (String(rede) as RedeSocial) : undefined,
      conteudo: empresaId ? { calendario: { empresaId: String(empresaId) } } : undefined,
    },
    include: { conteudo: { include: { calendario: { include: { empresa: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(publicacoes);
});
