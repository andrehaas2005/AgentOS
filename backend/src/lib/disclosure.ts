const DISCLOSURE =
  "🤖 Este conteúdo foi gerado e publicado automaticamente pelo AgentOS, sistema de gerenciamento de conteúdo por agentes de IA.";

export function comDisclosureAutomatico(texto: string): string {
  return `${texto}\n\n${DISCLOSURE}`;
}
