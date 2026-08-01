import { prisma } from "../db";
import { NOMES_EXIBICAO, subagentes } from "../agentes/definicoes";

export type Skill = {
  chave: string;
  nome: string;
  descricao: string;
  descricaoPadrao: string;
  prompt: string;
  promptPadrao: string;
};

// Os prompts dos papéis fixos do pipeline (estrategista, redator, diretor de arte,
// diretor de vídeo, revisor de marca) e de skills auxiliares (ex.: diretor-arte-chat, usada
// só internamente por chats de recriação) vivem no banco (editáveis pelo usuário via
// obterSkills/listarSkills), com definicoes.ts servindo de seed/padrão de fábrica. Roda a
// cada chamada (não só na primeira) pra pegar chaves novas adicionadas depois do seed
// inicial — sem isso, uma skill nova em definicoes.ts nunca apareceria no banco.
async function seedSeNecessario(): Promise<void> {
  const existentes = await prisma.skillAgente.findMany({ select: { chave: true } });
  const chavesExistentes = new Set(existentes.map((s) => s.chave));
  const faltando = Object.entries(subagentes).filter(([chave]) => !chavesExistentes.has(chave));
  if (faltando.length === 0) return;

  await prisma.skillAgente.createMany({
    data: faltando.map(([chave, def]) => ({
      chave,
      nome: NOMES_EXIBICAO[chave] ?? chave,
      descricao: def.description,
      descricaoPadrao: def.description,
      prompt: def.prompt,
      promptPadrao: def.prompt,
      modelo: typeof def.model === "string" ? def.model : "sonnet",
    })),
  });
}

export async function obterSkills(): Promise<Record<string, Skill>> {
  await seedSeNecessario();
  const linhas = await prisma.skillAgente.findMany();
  return Object.fromEntries(linhas.map((s) => [s.chave, s]));
}

// Só os 5 papéis fixos do pipeline aparecem na tela "Skills dos agentes" — skills auxiliares
// (diretor-arte-chat) ficam no banco pra uso interno, mas não viram um card editável extra
// duplicando o nome de exibição de "Diretor de Arte".
const ORDEM_PIPELINE = ["estrategista-conteudo", "redator", "diretor-arte", "diretor-video", "revisor-marca"];

export async function listarSkills(): Promise<Skill[]> {
  await seedSeNecessario();
  const linhas = await prisma.skillAgente.findMany({ where: { chave: { in: ORDEM_PIPELINE } } });
  return linhas.sort((a, b) => ORDEM_PIPELINE.indexOf(a.chave) - ORDEM_PIPELINE.indexOf(b.chave));
}
