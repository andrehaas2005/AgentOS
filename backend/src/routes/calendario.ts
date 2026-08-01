import { Router } from "express";
import { z } from "zod";
import type { StatusCalendario } from "@prisma/client";
import { prisma } from "../db";
import { executarAgenteCeo } from "../agentes/ceo";
import { atualizarStatusAposPublicacao } from "../lib/aprovacao";
import { TIPOS_POST } from "../lib/tiposPost";

export const calendarioRouter = Router();

const REDES = ["instagram", "facebook", "youtube", "linkedin", "tiktok", "blog", "outro"] as const;

const calendarioInput = z.object({
  empresaId: z.string().uuid(),
  dataHora: z.coerce.date(),
  tipoPost: z.enum(TIPOS_POST),
  briefing: z.string().optional(),
  aprovacaoAutomatica: z.boolean().optional(),
  // Vazio/omitido = publica em todas as redes conectadas da empresa (comportamento padrão,
  // preserva os itens já existentes). Quando preenchido, restringe a essas redes.
  redesAlvo: z.array(z.enum(REDES)).optional(),
});

calendarioRouter.get("/", async (req, res) => {
  const { empresaId, status } = req.query;
  const itens = await prisma.calendarioItem.findMany({
    where: {
      empresaId: empresaId ? String(empresaId) : undefined,
      status: status ? (String(status) as StatusCalendario) : undefined,
    },
    include: {
      // select (não include) por segurança: contasSociais.credenciais tem tokens de acesso
      // em texto puro — essa rota nunca deve devolver isso, só rede/status pro seletor de UI.
      empresa: { include: { contasSociais: { select: { rede: true, status: true } } } },
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
  const existe = await prisma.calendarioItem.findUnique({ where: { id: req.params.id } });
  if (!existe) return res.status(404).json({ error: "Item de calendário não encontrado" });

  // Recalcula antes de checar — garante que o status usado aqui é o mesmo que a tela já
  // mostra (a mesma fonte de verdade do frontend), mesmo que alguma tentativa de publicação
  // anterior tenha falhado em sincronizar isso a tempo. Só bloqueia exclusão se o item está
  // "publicado" de verdade (todas as redes-alvo publicadas); "erro" sempre pode ser excluído.
  await atualizarStatusAposPublicacao(req.params.id);
  const item = await prisma.calendarioItem.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ error: "Item de calendário não encontrado" });

  if (item.status === "publicado") {
    return res.status(409).json({ error: "Não é possível excluir uma postagem que já foi publicada." });
  }

  await prisma.calendarioItem.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// Recalcula o status a partir das publicações reais — corrige itens cujo status ficou
// desatualizado (ex: publicados por um caminho de código antigo que não sincronizava
// o status do agendamento de volta).
calendarioRouter.post("/:id/recalcular-status", async (req, res) => {
  await atualizarStatusAposPublicacao(req.params.id);
  const item = await prisma.calendarioItem.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ error: "Item de calendário não encontrado" });
  res.json(item);
});

calendarioRouter.post("/:id/executar", async (req, res) => {
  try {
    await prisma.calendarioItem.update({ where: { id: req.params.id }, data: { ultimoErro: null } }).catch(() => {});
    const resultado = await executarAgenteCeo(req.params.id);
    res.status(200).json(resultado);
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : "Erro desconhecido";
    await prisma.calendarioItem
      .update({ where: { id: req.params.id }, data: { status: "erro", ultimoErro: mensagem } })
      .catch(() => {});
    res.status(500).json({ error: mensagem });
  }
});
