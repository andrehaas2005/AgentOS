import { Router } from "express";
import { z } from "zod";
import type { StatusCalendario } from "@prisma/client";
import { prisma } from "../db";
import { executarAgenteCeo } from "../agentes/ceo";

export const calendarioRouter = Router();

const TIPOS_POST = [
  "imagem_frase",
  "carrossel",
  "animacao",
  "video_curto",
  "stories",
  "reels",
  "post",
] as const;

const calendarioInput = z.object({
  empresaId: z.string().uuid(),
  dataHora: z.coerce.date(),
  tipoPost: z.enum(TIPOS_POST),
  briefing: z.string().optional(),
});

calendarioRouter.get("/", async (req, res) => {
  const { empresaId, status } = req.query;
  const itens = await prisma.calendarioItem.findMany({
    where: {
      empresaId: empresaId ? String(empresaId) : undefined,
      status: status ? (String(status) as StatusCalendario) : undefined,
    },
    include: {
      empresa: true,
      conteudos: { include: { publicacoes: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { dataHora: "asc" },
  });
  res.json(itens);
});

calendarioRouter.post("/", async (req, res) => {
  const parsed = calendarioInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const item = await prisma.calendarioItem.create({ data: parsed.data });
  res.status(201).json(item);
});

calendarioRouter.patch("/:id", async (req, res) => {
  const parsed = calendarioInput.omit({ empresaId: true }).partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const item = await prisma.calendarioItem.update({ where: { id: req.params.id }, data: parsed.data }).catch(() => null);
  if (!item) return res.status(404).json({ error: "Item de calendário não encontrado" });
  res.json(item);
});

calendarioRouter.delete("/:id", async (req, res) => {
  const item = await prisma.calendarioItem.findUnique({
    where: { id: req.params.id },
    include: { conteudos: { include: { publicacoes: true } } },
  });
  if (!item) return res.status(404).json({ error: "Item de calendário não encontrado" });

  const jaPublicado = item.conteudos.some((c) => c.publicacoes.some((p) => p.status === "publicado"));
  if (jaPublicado) {
    return res.status(409).json({ error: "Não é possível excluir uma postagem que já foi publicada." });
  }

  await prisma.calendarioItem.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

calendarioRouter.post("/:id/executar", async (req, res) => {
  try {
    const resultado = await executarAgenteCeo(req.params.id);
    res.status(200).json(resultado);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Erro desconhecido" });
  }
});
