import { Router } from "express";
import type { TipoPost } from "@prisma/client";
import { prisma } from "../db";

export const conteudosRouter = Router();

conteudosRouter.get("/", async (req, res) => {
  const { empresaId, tipoPost } = req.query;
  const conteudos = await prisma.conteudo.findMany({
    where: {
      calendario: {
        empresaId: empresaId ? String(empresaId) : undefined,
        tipoPost: tipoPost ? (String(tipoPost) as TipoPost) : undefined,
      },
    },
    include: { calendario: { include: { empresa: true } }, publicacoes: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(conteudos);
});
