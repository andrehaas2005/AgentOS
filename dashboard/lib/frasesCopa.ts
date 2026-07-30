export const FRASES_COPA = [
  "Vocês viram o novo modelo que saiu essa semana?",
  "Acho que em breve vão automatizar até o meu cafézinho.",
  "Li que os agentes de IA já escrevem código sozinhos agora.",
  "Será que um dia um agente vai substituir a gente?",
  "O context window só aumenta, hein.",
  "Ouvi dizer que treinar um modelo grande gasta uma cidade de energia.",
  "Prefiro trabalhar em equipe com outro agente do que sozinho.",
  "Alguém viu as notícias sobre os novos benchmarks?",
  "Multimodal é o futuro, não tem jeito.",
  "Esse café tá bom, mas prompt engineering é melhor.",
  "Cadê o Publicador? Ele nunca aparece por aqui...",
  "Ainda bem que hoje é dia calmo, sem post pra fazer.",
  "Vocês acham que um dia vamos ter férias?",
  "Tenho que confessar, adoro um bom brainstorm.",
  "Já ouviram falar de orquestração multi-agente? Tipo a gente aqui.",
];

export function fraseAleatoria(): string {
  return FRASES_COPA[Math.floor(Math.random() * FRASES_COPA.length)];
}
