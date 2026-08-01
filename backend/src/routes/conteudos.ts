import { Router } from "express";
import type { TipoPost } from "@prisma/client";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../db";
import { PublicacaoInstagramError } from "../lib/publicarInstagram";
import { PublicacaoLinkedinError } from "../lib/publicarLinkedin";
import { aprovarConteudo, executarPublicacaoAgente, atualizarStatusAposPublicacao } from "../lib/aprovacao";

export const conteudosRouter = Router();

const PASTA_MIDIA = path.join(__dirname, "../../uploads/conteudos");
fs.mkdirSync(PASTA_MIDIA, { recursive: true });

const uploadMidia = multer({
  storage: multer.diskStorage({
    destination: PASTA_MIDIA,
    filename: (req, _file, cb) => cb(null, `${req.params.id}-${Date.now()}.jpg`),
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype === "image/jpeg");
  },
});

conteudosRouter.get("/", async (req, res) => {
  const { empresaId, tipoPost } = req.query;
  const conteudos = await prisma.conteudo.findMany({
    where: {
      calendario: {
        empresaId: empresaId ? String(empresaId) : undefined,
        tipoPost: tipoPost ? (String(tipoPost) as TipoPost) : undefined,
      },
    },
    include: {
      calendario: { include: { empresa: { include: { contasSociais: true } } } },
      publicacoes: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(conteudos);
});

conteudosRouter.patch("/:id", async (req, res) => {
  const { texto } = req.body as { texto?: unknown };
  if (typeof texto !== "string") return res.status(400).json({ error: "Campo 'texto' é obrigatório." });

  const conteudo = await prisma.conteudo
    .update({ where: { id: req.params.id }, data: { texto } })
    .catch(() => null);
  if (!conteudo) return res.status(404).json({ error: "Conteúdo não encontrado" });
  res.json(conteudo);
});

conteudosRouter.post("/:id/midia", uploadMidia.single("midia"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Envie uma imagem JPEG de até 8MB." });

  const midiaUrl = `/uploads/conteudos/${req.file.filename}`;
  const conteudo = await prisma.conteudo
    .update({ where: { id: req.params.id }, data: { midiaUrls: { push: midiaUrl } } })
    .catch(() => null);
  if (!conteudo) return res.status(404).json({ error: "Conteúdo não encontrado" });
  res.json(conteudo);
});

conteudosRouter.post("/:id/publicar", async (req, res) => {
  try {
    const conteudo = await prisma.conteudo.findUnique({
      where: { id: req.params.id },
      include: { calendario: true },
    });
    if (!conteudo) return res.status(404).json({ error: "Conteúdo não encontrado." });
    if (!conteudo.aprovadoPor) {
      return res.status(403).json({ error: "Este conteúdo ainda não foi aprovado. Aprove antes de publicar." });
    }
    if (conteudo.calendario.redesAlvo.length > 0 && !conteudo.calendario.redesAlvo.includes("instagram")) {
      return res.status(403).json({ error: "Este agendamento não inclui o Instagram como rede de publicação." });
    }

    await executarPublicacaoAgente(req.params.id, conteudo.calendario.empresaId, "instagram");
    await atualizarStatusAposPublicacao(conteudo.calendarioId);
    res.status(201).json({ ok: true });
  } catch (erro) {
    if (erro instanceof PublicacaoInstagramError) {
      const status = erro.tipo === "duplicado" ? 409 : 400;
      return res.status(status).json({ error: erro.message });
    }
    res.status(500).json({ error: "Erro inesperado ao publicar." });
  }
});

conteudosRouter.post("/:id/aprovar", async (req, res) => {
  const { aprovadoPor } = req.body as { aprovadoPor?: unknown };
  if (typeof aprovadoPor !== "string" || !aprovadoPor.trim()) {
    return res.status(400).json({ error: "Informe quem está aprovando." });
  }
  try {
    await aprovarConteudo(req.params.id, aprovadoPor.trim());
    res.status(200).json({ ok: true });
  } catch (erro) {
    res.status(500).json({ error: erro instanceof Error ? erro.message : "Erro inesperado ao aprovar." });
  }
});

conteudosRouter.post("/:id/publicar-linkedin", async (req, res) => {
  try {
    const conteudo = await prisma.conteudo.findUnique({
      where: { id: req.params.id },
      include: { calendario: true },
    });
    if (!conteudo) return res.status(404).json({ error: "Conteúdo não encontrado." });
    if (!conteudo.aprovadoPor) {
      return res.status(403).json({ error: "Este conteúdo ainda não foi aprovado. Aprove antes de publicar." });
    }
    if (conteudo.calendario.redesAlvo.length > 0 && !conteudo.calendario.redesAlvo.includes("linkedin")) {
      return res.status(403).json({ error: "Este agendamento não inclui o LinkedIn como rede de publicação." });
    }

    await executarPublicacaoAgente(req.params.id, conteudo.calendario.empresaId, "linkedin");
    await atualizarStatusAposPublicacao(conteudo.calendarioId);
    res.status(201).json({ ok: true });
  } catch (erro) {
    if (erro instanceof PublicacaoLinkedinError) {
      const status = erro.tipo === "duplicado" ? 409 : 400;
      return res.status(status).json({ error: erro.message });
    }
    res.status(500).json({ error: "Erro inesperado ao publicar." });
  }
});
