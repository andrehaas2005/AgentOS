import { Router } from "express";
import { z } from "zod";
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
  const { empresaId } = req.query;
  const itens = await prisma.calendarioItem.findMany({
    where: empresaId ? { empresaId: String(empresaId) } : undefined,
    include: { empresa: true },
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

calendarioRouter.post("/:id/executar", async (req, res) => {
  try {
    const resultado = await executarAgenteCeo(req.params.id);
    res.status(200).json(resultado);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Erro desconhecido" });
  }
});
