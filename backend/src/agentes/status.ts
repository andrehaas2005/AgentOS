type StatusAtivo = {
  desde: number;
  descricao?: string;
};

const ativos = new Map<string, StatusAtivo>();

export function marcarAtivo(agente: string, descricao?: string) {
  ativos.set(agente, { desde: Date.now(), descricao });
}

export function marcarInativo(agente: string) {
  ativos.delete(agente);
}

export function obterAtivos() {
  return ativos;
}
