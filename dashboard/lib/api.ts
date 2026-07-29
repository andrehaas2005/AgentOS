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
