import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { mascararCredenciais } from "../lib/mascarar";

export const contasSociaisRouter = Router();

const REDES = ["instagram", "facebook", "youtube", "linkedin", "tiktok", "blog", "outro"] as const;

const contaSocialInput = z.object({
  empresaId: z.string().uuid(),
  rede: z.enum(REDES),
  rotuloCustom: z.string().optional(),
  credenciais: z.record(z.string(), z.string()).optional(),
  status: z.string().optional(),
});

contasSociaisRouter.post("/", async (req, res) => {
  const parsed = contaSocialInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const conta = await prisma.contaSocial.create({ data: parsed.data });
  res.status(201).json({ ...conta, credenciais: mascararCredenciais(conta.credenciais) });
});

contasSociaisRouter.patch("/:id", async (req, res) => {
  const parsed = contaSocialInput.omit({ empresaId: true }).partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existente = await prisma.contaSocial.findUnique({ where: { id: req.params.id } });
  if (!existente) return res.status(404).json({ error: "Conta social não encontrada" });

  const credenciaisAtuais = (existente.credenciais as Record<string, string> | null) ?? {};
  const credenciaisNovas = parsed.data.credenciais
    ? { ...credenciaisAtuais, ...parsed.data.credenciais }
    : undefined;

  const conta = await prisma.contaSocial.update({
    where: { id: req.params.id },
    data: { ...parsed.data, credenciais: credenciaisNovas },
  });
  res.json({ ...conta, credenciais: mascararCredenciais(conta.credenciais) });
});

contasSociaisRouter.delete("/:id", async (req, res) => {
  await prisma.contaSocial.delete({ where: { id: req.params.id } }).catch(() => null);
  res.status(204).send();
});
