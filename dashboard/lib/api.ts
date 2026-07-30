const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type Empresa = {
  id: string;
  nome: string;
  nicho: string | null;
  tomDeVoz: string | null;
  createdAt: string;
  contasSociais: { id: string; rede: string; status: string }[];
};

export type CalendarioItem = {
  id: string;
  empresaId: string;
  dataHora: string;
  tipoPost: string;
  briefing: string | null;
  status: string;
  empresa: { nome: string };
};

export type ExecucaoAgente = {
  id: string;
  agente: string;
  status: string;
  createdAt: string;
  entrada?: unknown;
  saida?: unknown;
  duracaoMs?: number | null;
  custoTokens?: number | null;
};

export type Conteudo = {
  id: string;
  calendarioId: string;
  texto: string | null;
  midiaUrls: string[];
  versao: number;
  createdAt: string;
  calendario: {
    tipoPost: string;
    dataHora: string;
    status: string;
    empresa: { nome: string };
  };
  publicacoes: { id: string; rede: string; status: string }[];
};

export type Publicacao = {
  id: string;
  rede: string;
  externalPostId: string | null;
  status: string;
  log: string | null;
  createdAt: string;
  conteudo: {
    calendario: {
      tipoPost: string;
      empresa: { nome: string };
    };
  };
};

export type StatusAtivo = {
  agente: string;
  desde: string;
  descricao: string | null;
};

export type AgenteStats = {
  agente: string;
  totalExecucoes: number;
  custoTokensTotal: number;
  duracaoMsMedia: number | null;
  ultimaExecucao: { status: string; createdAt: string } | null;
};

export type DashboardStats = {
  empresas: number;
  agentesConfigurados: number;
  postagensAgendadas: number;
  publicadasNoMes: number;
  alertas: number;
};

async function safeFetch<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export function getStats() {
  return safeFetch<DashboardStats>("/api/dashboard/stats", {
    empresas: 0,
    agentesConfigurados: 7,
    postagensAgendadas: 0,
    publicadasNoMes: 0,
    alertas: 0,
  });
}

export function getEventos() {
  return safeFetch<ExecucaoAgente[]>("/api/dashboard/eventos", []);
}

export function getEmpresas() {
  return safeFetch<Empresa[]>("/api/empresas", []);
}

export function getCalendario(empresaId?: string) {
  const qs = empresaId ? `?empresaId=${empresaId}` : "";
  return safeFetch<CalendarioItem[]>(`/api/calendario${qs}`, []);
}

export function getConteudos(empresaId?: string) {
  const qs = empresaId ? `?empresaId=${empresaId}` : "";
  return safeFetch<Conteudo[]>(`/api/conteudos${qs}`, []);
}

export function getPublicacoes() {
  return safeFetch<Publicacao[]>("/api/publicacoes", []);
}

export function getAgentesStats() {
  return safeFetch<AgenteStats[]>("/api/agentes", []);
}

export function getAgenteTimeline(nome: string) {
  return safeFetch<ExecucaoAgente[]>(`/api/agentes/${encodeURIComponent(nome)}/timeline`, []);
}

export function getAgentesStatus() {
  return safeFetch<StatusAtivo[]>("/api/agentes/status", []);
}
