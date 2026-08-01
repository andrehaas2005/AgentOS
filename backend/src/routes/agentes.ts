import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { obterAtivos } from "../agentes/status";
import { listarSkills } from "../lib/skillsAgentes";
import { gerarJson } from "../lib/llmClient";

export const agentesRouter = Router();

// CEO e Publicador não têm prompt de LLM — o CEO orquestra (código determinístico) e o
// Publicador só chama as APIs das redes — por isso ficam com "prompt: null" aqui, e não
// são editáveis (não têm chave/linha em SkillAgente).
const FUNCAO_SEM_PROMPT: Record<string, string> = {
  CEO: "Orquestra o time: decide a ordem das etapas, dispara cada subagente e decide o que produzir/publicar. Não usa prompt de LLM fixo — a lógica de orquestração é código determinístico.",
  Publicador: "Publica o conteúdo aprovado na rede certa (Instagram, LinkedIn) chamando as APIs de cada rede diretamente. Não usa prompt de LLM — é uma ação determinística de código.",
};

agentesRouter.get("/definicoes", async (_req, res) => {
  const skills = await listarSkills();
  const doPipeline = skills.map((s) => ({
    chave: s.chave,
    nome: s.nome,
    descricao: s.descricao,
    prompt: s.prompt,
  }));
  const semPrompt = Object.entries(FUNCAO_SEM_PROMPT).map(([nome, descricao]) => ({
    chave: null,
    nome,
    descricao,
    prompt: null,
  }));
  res.json([semPrompt[0], ...doPipeline, semPrompt[1]]);
});

const skillInput = z.object({
  nome: z.string().trim().min(1).optional(),
  descricao: z.string().trim().min(1).optional(),
  prompt: z.string().trim().min(1).optional(),
});

agentesRouter.patch("/definicoes/:chave", async (req, res) => {
  const parsed = skillInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const skill = await prisma.skillAgente
    .update({ where: { chave: req.params.chave }, data: parsed.data })
    .catch(() => null);
  if (!skill) return res.status(404).json({ error: "Skill não encontrada" });
  res.json(skill);
});

agentesRouter.post("/definicoes/:chave/restaurar", async (req, res) => {
  const atual = await prisma.skillAgente.findUnique({ where: { chave: req.params.chave } });
  if (!atual) return res.status(404).json({ error: "Skill não encontrada" });

  const skill = await prisma.skillAgente.update({
    where: { chave: req.params.chave },
    data: { descricao: atual.descricaoPadrao, prompt: atual.promptPadrao },
  });
  res.json(skill);
});

const PROMPT_CONSULTOR_DE_SKILL = `Você é um consultor especialista em prompt engineering para agentes de IA de uma agência de
marketing digital automatizada. Você vai receber o prompt de sistema atual de um agente específico do time (sua
função/cargo, e o texto completo que ele segue hoje) e, opcionalmente, um pedido de melhoria de quem está editando.
Sugira uma versão revisada do prompt: mantenha o mesmo objetivo e formato de resposta esperado do agente, mas torne
as instruções mais claras, específicas e alinhadas ao pedido (quando houver). Se não houver pedido específico, foque
em clareza, remover ambiguidade e reforçar boas práticas pro papel dele. Responda no formato pedido: o prompt
revisado completo, e uma explicação curta (1-3 frases) do que mudou e por quê.`;

agentesRouter.post("/definicoes/:chave/sugestao", async (req, res) => {
  const skill = await prisma.skillAgente.findUnique({ where: { chave: req.params.chave } });
  if (!skill) return res.status(404).json({ error: "Skill não encontrada" });

  const { pedido } = req.body as { pedido?: unknown };
  const pedidoTexto = typeof pedido === "string" ? pedido.trim() : "";

  try {
    const sugestao = await gerarJson<{ promptSugerido: string; explicacao: string }>(
      PROMPT_CONSULTOR_DE_SKILL,
      `Agente: ${skill.nome}\nDescrição da função: ${skill.descricao}\n\nPrompt atual:\n${skill.prompt}\n\n${
        pedidoTexto ? `Pedido de quem está editando: ${pedidoTexto}` : "Nenhum pedido específico — sugira melhorias gerais de clareza."
      }`,
      {
        type: "OBJECT",
        properties: {
          promptSugerido: { type: "STRING" },
          explicacao: { type: "STRING" },
        },
        required: ["promptSugerido", "explicacao"],
      },
    );
    res.json(sugestao);
  } catch (erro) {
    res.status(500).json({ error: erro instanceof Error ? erro.message : "Erro inesperado ao gerar sugestão." });
  }
});

agentesRouter.get("/status", (_req, res) => {
  const ativos = Array.from(obterAtivos().entries()).map(([agente, info]) => ({
    agente,
    desde: new Date(info.desde).toISOString(),
    descricao: info.descricao ?? null,
  }));
  res.json(ativos);
});

agentesRouter.get("/:nome/timeline", async (req, res) => {
  const execucoes = await prisma.execucaoAgente.findMany({
    where: { agente: req.params.nome },
    orderBy: { createdAt: "desc" },
    take: 15,
  });
  res.json(execucoes);
});

agentesRouter.get("/", async (req, res) => {
  const empresaId = req.query.empresaId ? String(req.query.empresaId) : undefined;

  const grupos = await prisma.execucaoAgente.groupBy({
    by: ["agente"],
    where: { empresaId },
    _count: { _all: true },
    _sum: { custoTokens: true },
    _avg: { duracaoMs: true },
  });

  const ultimas = await prisma.execucaoAgente.findMany({
    where: { empresaId },
    distinct: ["agente"],
    orderBy: { createdAt: "desc" },
    select: { agente: true, status: true, createdAt: true },
  });
  const ultimaPorAgente = new Map(ultimas.map((u) => [u.agente, u]));

  const stats = grupos.map((grupo) => ({
    agente: grupo.agente,
    totalExecucoes: grupo._count._all,
    custoTokensTotal: grupo._sum.custoTokens ?? 0,
    duracaoMsMedia: grupo._avg.duracaoMs ? Math.round(grupo._avg.duracaoMs) : null,
    ultimaExecucao: ultimaPorAgente.get(grupo.agente) ?? null,
  }));

  res.json(stats);
});
