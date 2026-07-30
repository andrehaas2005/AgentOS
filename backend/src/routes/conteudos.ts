import { Router } from "express";
import { prisma } from "../db";

export const conteudosRouter = Router();

conteudosRouter.get("/", async (req, res) => {
  const { empresaId } = req.query;
  const conteudos = await prisma.conteudo.findMany({
    where: empresaId ? { calendario: { empresaId: String(empresaId) } } : undefined,
    include: { calendario: { include: { empresa: true } }, publicacoes: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(conteudos);
});
