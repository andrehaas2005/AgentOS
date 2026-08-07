import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import type { TipoPost } from "@prisma/client";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { prisma } from "../db";
import { PublicacaoInstagramError } from "../lib/publicarInstagram";
import { PublicacaoLinkedinError } from "../lib/publicarLinkedin";
import { aprovarConteudo, executarPublicacaoAgente, atualizarStatusAposPublicacao } from "../lib/aprovacao";
import { TIPOS_POST } from "../lib/tiposPost";
import {
  removerArquivoMidiaDoDisco,
  regenerarMidiaConteudo,
  gerarVideoInicialConteudo,
  RegeneracaoIndisponivelError,
} from "../lib/midiaConteudo";
import { dispararRevisao } from "../lib/revisao";
import { replicarConteudo } from "../lib/replicarConteudo";
import { dispararTurnoRecriacaoSlide } from "../lib/recriarSlide";

export const conteudosRouter = Router();

const PASTA_MIDIA = path.join(__dirname, "../../uploads/conteudos");
fs.mkdirSync(PASTA_MIDIA, { recursive: true });

const LIMITE_IMAGEM = 8 * 1024 * 1024;
const LIMITE_VIDEO = 100 * 1024 * 1024;
const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
};

const uploadMidia = multer({
  storage: multer.diskStorage({
    destination: PASTA_MIDIA,
    filename: (req, file, cb) => cb(null, `${req.params.id}-${Date.now()}${MIME_EXT[file.mimetype] ?? ""}`),
  }),
  limits: { fileSize: LIMITE_VIDEO },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype in MIME_EXT),
});

// Multer manda erro de tamanho pro handler de erro padrão do Express (resposta HTML) se
// não for tratado aqui — importante agora que o limite de vídeo é bem maior que o de imagem.
function uploadComErroTratado(req: Request, res: Response, next: NextFunction) {
  uploadMidia.single("midia")(req, res, (erro) => {
    if (erro instanceof multer.MulterError && erro.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "Arquivo muito grande (máx. 100MB para vídeo, 8MB para imagem)." });
    }
    if (erro) return res.status(400).json({ error: "Não foi possível processar o upload." });
    next();
  });
}

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
    .update({ where: { id: req.params.id }, data: { texto, versao: { increment: 1 } } })
    .catch(() => null);
  if (!conteudo) return res.status(404).json({ error: "Conteúdo não encontrado" });
  res.json(conteudo);
});

conteudosRouter.post("/:id/midia", uploadComErroTratado, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Envie uma imagem JPEG (até 8MB) ou vídeo MP4/MOV/WEBM (até 100MB)." });

  if (req.file.mimetype === "image/jpeg" && req.file.size > LIMITE_IMAGEM) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: "Imagens devem ter até 8MB." });
  }

  const midiaUrl = `/uploads/conteudos/${req.file.filename}`;
  const conteudo = await prisma.conteudo
    .update({ where: { id: req.params.id }, data: { midiaUrls: { push: midiaUrl }, versao: { increment: 1 } } })
    .catch(() => null);
  if (!conteudo) return res.status(404).json({ error: "Conteúdo não encontrado" });
  res.json(conteudo);
});

conteudosRouter.patch("/:id/tipo", async (req, res) => {
  const parsed = z.object({ tipoPost: z.enum(TIPOS_POST) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const conteudo = await prisma.conteudo.findUnique({ where: { id: req.params.id } });
  if (!conteudo) return res.status(404).json({ error: "Conteúdo não encontrado." });

  await prisma.calendarioItem.update({
    where: { id: conteudo.calendarioId },
    data: { tipoPost: parsed.data.tipoPost },
  });
  const atualizado = await prisma.conteudo.update({
    where: { id: req.params.id },
    data: { versao: { increment: 1 } },
    include: { calendario: { include: { empresa: { include: { contasSociais: true } } } }, publicacoes: true },
  });
  res.json(atualizado);
});

conteudosRouter.delete("/:id/midia", async (req, res) => {
  const { url } = req.body as { url?: unknown };
  if (typeof url !== "string" || !url) return res.status(400).json({ error: "Informe a mídia a remover." });

  const conteudo = await prisma.conteudo.findUnique({ where: { id: req.params.id } });
  if (!conteudo) return res.status(404).json({ error: "Conteúdo não encontrado." });
  if (!conteudo.midiaUrls.includes(url)) return res.status(404).json({ error: "Mídia não encontrada neste conteúdo." });

  const midiaUrls = conteudo.midiaUrls.filter((u) => u !== url);
  const atualizado = await prisma.conteudo.update({
    where: { id: req.params.id },
    data: { midiaUrls: { set: midiaUrls }, versao: { increment: 1 } },
  });
  removerArquivoMidiaDoDisco(url);
  res.json(atualizado);
});

conteudosRouter.post("/:id/midia/regenerar", async (req, res) => {
  const { indice } = req.body as { indice?: unknown };
  if (typeof indice !== "number" || indice < 0) return res.status(400).json({ error: "Índice de mídia inválido." });

  try {
    const conteudo = await regenerarMidiaConteudo(req.params.id, indice);
    res.json(conteudo);
  } catch (erro) {
    res.status(erro instanceof RegeneracaoIndisponivelError ? 502 : 400).json({
      error: erro instanceof Error ? erro.message : "Erro inesperado ao gerar a mídia.",
    });
  }
});

conteudosRouter.post("/:id/midia/gerar-video", async (req, res) => {
  try {
    const conteudo = await gerarVideoInicialConteudo(req.params.id);
    res.json(conteudo);
  } catch (erro) {
    res.status(erro instanceof RegeneracaoIndisponivelError ? 502 : 400).json({
      error: erro instanceof Error ? erro.message : "Erro inesperado ao gerar o vídeo.",
    });
  }
});

const mensagemChatInput = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});
const recriarSlideInput = z.object({
  indice: z.number().int().min(0),
  mensagens: z.array(mensagemChatInput),
});

conteudosRouter.post("/:id/midia/recriar", async (req, res) => {
  const parsed = recriarSlideInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const turno = await dispararTurnoRecriacaoSlide(req.params.id, parsed.data.indice, parsed.data.mensagens);
    res.json(turno);
  } catch (erro) {
    console.error("Erro ao recriar slide:", erro);
    res.status(400).json({ error: erro instanceof Error ? erro.message : "Erro inesperado ao recriar o slide." });
  }
});

conteudosRouter.post("/:id/revisao", async (req, res) => {
  try {
    const revisao = await dispararRevisao(req.params.id);
    res.status(201).json(revisao);
  } catch (erro) {
    res.status(500).json({ error: erro instanceof Error ? erro.message : "Erro inesperado ao revisar." });
  }
});

const replicarInput = z.object({ empresaId: z.string().uuid(), dataHora: z.coerce.date() });

conteudosRouter.post("/:id/replicar", async (req, res) => {
  const parsed = replicarInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const resultado = await replicarConteudo(req.params.id, parsed.data);
    res.status(201).json({ conteudoId: resultado.id, calendarioId: resultado.calendarioId });
  } catch (erro) {
    res.status(400).json({ error: erro instanceof Error ? erro.message : "Erro inesperado ao replicar." });
  }
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
    // Recalcula mesmo na falha — sem isso o status do agendamento pode ficar desatualizado
    // (ex: preso em "aprovado") depois de uma tentativa que falhou, escondendo o erro real.
    const conteudo = await prisma.conteudo.findUnique({ where: { id: req.params.id } });
    if (conteudo) await atualizarStatusAposPublicacao(conteudo.calendarioId);

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

  const conteudo = await prisma.conteudo.findUnique({ where: { id: req.params.id } });
  if (!conteudo) return res.status(404).json({ error: "Conteúdo não encontrado." });

  // Gate só se aplica aqui (aprovação manual) — de propósito não entra em aprovarConteudo(),
  // pra não quebrar a aprovação automática do agendador (aprovacaoAutomatica=true), que por
  // definição pula qualquer revisão manual.
  const metadata = (conteudo.metadata as { ultimaRevisao?: { versaoRevisada: number } } | null) ?? {};
  if (metadata.ultimaRevisao?.versaoRevisada !== conteudo.versao) {
    return res.status(403).json({
      error: `Rode a revisão de marca na versão atual (v${conteudo.versao}) antes de aprovar.`,
    });
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
    // Recalcula mesmo na falha — sem isso o status do agendamento pode ficar desatualizado
    // (ex: preso em "aprovado") depois de uma tentativa que falhou, escondendo o erro real.
    const conteudo = await prisma.conteudo.findUnique({ where: { id: req.params.id } });
    if (conteudo) await atualizarStatusAposPublicacao(conteudo.calendarioId);

    if (erro instanceof PublicacaoLinkedinError) {
      const status = erro.tipo === "duplicado" ? 409 : 400;
      return res.status(status).json({ error: erro.message });
    }
    res.status(500).json({ error: "Erro inesperado ao publicar." });
  }
});
