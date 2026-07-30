import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

export const empresasRouter = Router();

const empresaInput = z.object({
  nome: z.string().min(1),
  nicho: z.string().optional(),
  tomDeVoz: z.string().optional(),
  brandGuidelines: z.record(z.string(), z.any()).optional(),
});

empresasRouter.get("/", async (_req, res) => {
  const empresas = await prisma.empresa.findMany({
    include: { contasSociais: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(empresas);
});

empresasRouter.get("/:id", async (req, res) => {
  const empresa = await prisma.empresa.findUnique({
    where: { id: req.params.id },
    include: { contasSociais: true, calendario: true },
  });
  if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });
  res.json(empresa);
});

empresasRouter.post("/", async (req, res) => {
  const parsed = empresaInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const empresa = await prisma.empresa.create({ data: parsed.data });
  res.status(201).json(empresa);
});
