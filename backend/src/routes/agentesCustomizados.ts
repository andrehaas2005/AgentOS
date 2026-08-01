import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { gerarJson } from "../lib/llmClient";

export const agentesCustomizadosRouter = Router();

const agenteInput = z.object({
  nome: z.string().trim().min(1),
  descricao: z.string().trim().min(1),
  prompt: z.string().trim().min(1),
  ativo: z.boolean().optional(),
});

agentesCustomizadosRouter.get("/", async (_req, res) => {
  const agentes = await prisma.agenteCustomizado.findMany({ orderBy: { createdAt: "asc" } });
  res.json(agentes);
});

agentesCustomizadosRouter.post("/", async (req, res) => {
  const parsed = agenteInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const agente = await prisma.agenteCustomizado.create({
    data: { ...parsed.data, origem: "manual" },
  });
  res.status(201).json(agente);
});

const PROMPT_CEO_CRIA_AGENTE = `Você é o CEO de uma agência de marketing digital automatizada, responsável por montar o time de
agentes de IA. Alguém do time pediu a criação de um novo agente subordinado. Com base no pedido, defina:
(1) um nome curto no estilo dos cargos já existentes (ex: "Especialista em SEO", "Analista de Tendências");
(2) uma descrição de uma frase da função dele;
(3) o prompt completo de sistema que esse agente vai seguir toda vez que for executado — escreva em português,
no mesmo estilo dos outros agentes da agência (comece com "Você é o [nome] de uma agência de marketing
digital.", explique a tarefa e o formato esperado da resposta em texto corrido).
Responda estritamente no formato pedido.`;

// Gera um RASCUNHO — não salva nada, o usuário revisa e ajusta antes de criar de verdade.
agentesCustomizadosRouter.post("/gerar", async (req, res) => {
  const { pedido } = req.body as { pedido?: unknown };
  if (typeof pedido !== "string" || !pedido.trim()) {
    return res.status(400).json({ error: "Descreva o que o novo agente deve fazer." });
  }
  try {
    const rascunho = await gerarJson<{ nome: string; descricao: string; prompt: string }>(
      PROMPT_CEO_CRIA_AGENTE,
      `Pedido: ${pedido.trim()}`,
      {
        type: "OBJECT",
        properties: {
          nome: { type: "STRING" },
          descricao: { type: "STRING" },
          prompt: { type: "STRING" },
        },
        required: ["nome", "descricao", "prompt"],
      },
    );
    res.json(rascunho);
  } catch (erro) {
    res.status(500).json({ error: erro instanceof Error ? erro.message : "Erro inesperado ao gerar o agente." });
  }
});

agentesCustomizadosRouter.patch("/:id", async (req, res) => {
  const parsed = agenteInput.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const agente = await prisma.agenteCustomizado
    .update({ where: { id: req.params.id }, data: parsed.data })
    .catch(() => null);
  if (!agente) return res.status(404).json({ error: "Agente não encontrado" });
  res.json(agente);
});

agentesCustomizadosRouter.delete("/:id", async (req, res) => {
  await prisma.agenteCustomizado.delete({ where: { id: req.params.id } }).catch(() => null);
  res.status(204).send();
});
