import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

export const frasesRouter = Router();

const fraseInput = z.object({
  texto: z.string().trim().min(1),
  agentes: z.array(z.string()).default([]),
});

frasesRouter.get("/", async (_req, res) => {
  const frases = await prisma.fraseOciosa.findMany({ orderBy: { createdAt: "asc" } });
  res.json(frases);
});

frasesRouter.post("/", async (req, res) => {
  const parsed = fraseInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const frase = await prisma.fraseOciosa.create({ data: parsed.data });
  res.status(201).json(frase);
});

frasesRouter.patch("/:id", async (req, res) => {
  const parsed = fraseInput.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const frase = await prisma.fraseOciosa
    .update({ where: { id: req.params.id }, data: parsed.data })
    .catch(() => null);
  if (!frase) return res.status(404).json({ error: "Frase não encontrada" });
  res.json(frase);
});

frasesRouter.delete("/:id", async (req, res) => {
  await prisma.fraseOciosa.delete({ where: { id: req.params.id } }).catch(() => null);
  res.status(204).send();
});
