import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../db";
import { mascararCredenciais } from "../lib/mascarar";

export const empresasRouter = Router();

const empresaInput = z.object({
  nome: z.string().min(1),
  nicho: z.string().optional(),
  tomDeVoz: z.string().optional(),
  brandGuidelines: z.record(z.string(), z.any()).optional(),
});

const PASTA_LOGOS = path.join(__dirname, "../../uploads/logos");
fs.mkdirSync(PASTA_LOGOS, { recursive: true });

const uploadLogo = multer({
  storage: multer.diskStorage({
    destination: PASTA_LOGOS,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || ".png";
      cb(null, `${req.params.id}-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype.startsWith("image/"));
  },
});

function comCredenciaisMascaradas<T extends { contasSociais?: { credenciais: unknown }[] }>(empresa: T) {
  if (!empresa.contasSociais) return empresa;
  return {
    ...empresa,
    contasSociais: empresa.contasSociais.map((conta) => ({
      ...conta,
      credenciais: mascararCredenciais(conta.credenciais),
    })),
  };
}

empresasRouter.get("/", async (_req, res) => {
  const empresas = await prisma.empresa.findMany({
    include: { contasSociais: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(empresas.map(comCredenciaisMascaradas));
});

empresasRouter.get("/:id", async (req, res) => {
  const empresa = await prisma.empresa.findUnique({
    where: { id: req.params.id },
    include: { contasSociais: true, calendario: true },
  });
  if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });
  res.json(comCredenciaisMascaradas(empresa));
});

empresasRouter.post("/:id/logo", uploadLogo.single("logo"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Nenhum arquivo de imagem enviado" });

  const logoUrl = `/uploads/logos/${req.file.filename}`;
  const empresa = await prisma.empresa
    .update({ where: { id: req.params.id }, data: { logoUrl } })
    .catch(() => null);
  if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });
  res.json(empresa);
});

empresasRouter.post("/", async (req, res) => {
  const parsed = empresaInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const empresa = await prisma.empresa.create({ data: parsed.data });
  res.status(201).json(empresa);
});

empresasRouter.patch("/:id", async (req, res) => {
  const parsed = empresaInput.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const empresa = await prisma.empresa
    .update({ where: { id: req.params.id }, data: parsed.data })
    .catch(() => null);
  if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });
  res.json(empresa);
});
