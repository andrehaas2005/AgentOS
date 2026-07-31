const DISCLOSURE =
  "🤖 Este conteúdo foi gerado e publicado automaticamente pelo AgentOS, sistema de gerenciamento de conteúdo por agentes de IA. Criado por André Haas @andre.haas.77";

export function comDisclosureAutomatico(texto: string): string {
  return `${texto}\n\n${DISCLOSURE}`;
}
