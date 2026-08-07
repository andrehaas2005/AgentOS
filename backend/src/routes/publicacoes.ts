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

// Remove um registro de publicação (não apaga nada na rede social — só o rastro no AgentOS).
// Uso: corrigir um post que foi apagado manualmente na rede (ex.: publicou errado) ou um
// registro de erro/duplicado, liberando o conteúdo pra ser publicado de novo.
publicacoesRouter.delete("/:id", async (req, res) => {
  const publicacao = await prisma.publicacao.findUnique({ where: { id: req.params.id } });
  if (!publicacao) return res.status(404).json({ error: "Publicação não encontrada." });
  await prisma.publicacao.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
