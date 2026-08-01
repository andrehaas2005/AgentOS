import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { LAYOUT_ESCRITORIO_PADRAO } from "../lib/layoutEscritorioPadrao";

export const escritorioRouter = Router();

const ID_LAYOUT_SINGLETON = "singleton";

const salaInput = z.object({
  id: z.string(),
  nome: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  texturaPiso: z.string(),
});

const objetoInput = z.object({
  id: z.string(),
  salaId: z.string(),
  sprite: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  rotacao: z.number().optional(),
  camada: z.enum(["parede", "objeto"]),
});

const mesaInput = z.object({
  agenteId: z.string(),
  x: z.number(),
  y: z.number(),
  copaX: z.number(),
  copaY: z.number(),
});

const layoutInput = z.object({
  salas: z.array(salaInput),
  objetos: z.array(objetoInput),
  mesas: z.array(mesaInput),
});

escritorioRouter.get("/layout", async (_req, res) => {
  const existente = await prisma.layoutEscritorio.findUnique({ where: { id: ID_LAYOUT_SINGLETON } });
  if (existente) return res.json(existente.dados);

  // Primeira chamada: cria a linha singleton com o layout default, garantindo
  // que a cena renderizada hoje não mude de aparência no primeiro deploy.
  const criado = await prisma.layoutEscritorio.create({
    data: { id: ID_LAYOUT_SINGLETON, dados: LAYOUT_ESCRITORIO_PADRAO },
  });
  res.json(criado.dados);
});

escritorioRouter.put("/layout", async (req, res) => {
  const parsed = layoutInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const atualizado = await prisma.layoutEscritorio.upsert({
    where: { id: ID_LAYOUT_SINGLETON },
    create: { id: ID_LAYOUT_SINGLETON, dados: parsed.data },
    update: { dados: parsed.data },
  });
  res.json(atualizado.dados);
});
