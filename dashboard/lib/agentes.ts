import type { AgenteCustomizado } from "./api";

export const AGENTES = [
  { nome: "CEO", funcao: "Orquestra o time e prioriza o que produzir/publicar" },
  { nome: "Estrategista de Conteúdo", funcao: "Define o tema/ângulo de cada post" },
  { nome: "Redator", funcao: "Escreve legenda, hashtags e CTA" },
  { nome: "Diretor de Arte", funcao: "Gera prompts e imagens/carrosséis" },
  { nome: "Diretor de Vídeo", funcao: "Gera roteiro e vídeos/reels" },
  { nome: "Revisor de Marca", funcao: "Valida conteúdo contra as guidelines da empresa" },
  { nome: "Publicador", funcao: "Publica o conteúdo aprovado na rede certa" },
];

export const SPRITE_POR_AGENTE: Record<string, string> = {
  CEO: "/sprites/char-ceo.png",
  "Estrategista de Conteúdo": "/sprites/char-estrategista.png",
  Redator: "/sprites/char-redator.png",
  "Diretor de Arte": "/sprites/char-diretor-arte.png",
  "Diretor de Vídeo": "/sprites/char-diretor-video.png",
  "Revisor de Marca": "/sprites/char-revisor-marca.png",
  Publicador: "/sprites/char-publicador.png",
};

// Sprite usado por agentes customizados (não têm arte própria) — permite que
// apareçam no Escritório sem precisar cadastrar um sprite pra cada um.
const SPRITE_PADRAO = "/sprites/char-atendente.png";

export function spriteDoAgente(nome: string): string {
  return SPRITE_POR_AGENTE[nome] ?? SPRITE_PADRAO;
}

// Une os 7 papéis embutidos com os agentes customizados ativos — usado pela
// cena e pelo editor do Escritório, que precisam da lista completa de quem
// tem mesa própria.
export function agentesCompletos(customizados: AgenteCustomizado[]) {
  const ativos = customizados
    .filter((agente) => agente.ativo)
    .map((agente) => ({ nome: agente.nome, funcao: agente.descricao }));
  return [...AGENTES, ...ativos];
}
