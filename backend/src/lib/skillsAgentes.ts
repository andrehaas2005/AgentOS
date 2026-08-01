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

// Os prompts dos 5 papéis fixos do pipeline (estrategista, redator, diretor de arte,
// diretor de vídeo, revisor de marca) viviam só como constante em definicoes.ts — agora
// moram no banco (editáveis pelo usuário), com definicoes.ts servindo de seed/padrão de
// fábrica na primeira chamada, igual ao padrão já usado em LayoutEscritorio.
async function seedSeNecessario(): Promise<void> {
  const existentes = await prisma.skillAgente.count();
  if (existentes > 0) return;

  await prisma.skillAgente.createMany({
    data: Object.entries(subagentes).map(([chave, def]) => ({
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

const ORDEM_PIPELINE = Object.keys(subagentes);

export async function listarSkills(): Promise<Skill[]> {
  await seedSeNecessario();
  const linhas = await prisma.skillAgente.findMany();
  return linhas.sort((a, b) => ORDEM_PIPELINE.indexOf(a.chave) - ORDEM_PIPELINE.indexOf(b.chave));
}
