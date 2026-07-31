type StatusAtivo = {
  desde: number;
  descricao?: string;
};

const ativos = new Map<string, StatusAtivo>();

export function marcarAtivo(agente: string, descricao?: string) {
  ativos.set(agente, { desde: Date.now(), descricao });
  console.log(`[DEBUG board] status.ts marcarAtivo("${agente}") — Map agora:`, [...ativos.keys()]);
}

export function marcarInativo(agente: string) {
  ativos.delete(agente);
  console.log(`[DEBUG board] status.ts marcarInativo("${agente}") — Map agora:`, [...ativos.keys()]);
}

export function obterAtivos() {
  return ativos;
}
