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
