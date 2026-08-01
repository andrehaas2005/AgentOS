import { LAYOUT_ESCRITORIO_PADRAO, type LayoutEscritorioDados } from "./layoutEscritorioPadrao";

function resolverApiUrl(): string {
  if (typeof window === "undefined") {
    // Server Components rodam no processo Node do container e não podem usar
    // URL relativa (o navegador resolve "/api/..." contra a própria origem, o Node não).
    return process.env.INTERNAL_API_URL ?? "http://localhost:4000";
  }
  // "" é um valor válido e intencional (caminho relativo, mesma origem do navegador) —
  // usar ?? em vez de || pra não cair no fallback quando NEXT_PUBLIC_API_URL for string vazia.
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

export const API_URL = resolverApiUrl();

// NEXT_PUBLIC_API_URL é inlineado no build tanto no bundle do servidor quanto no do cliente
// com o mesmo valor literal — diferente de API_URL (que no servidor aponta pra rede interna
// do Docker), isso sempre resolve pra uma URL alcançável pelo navegador. Usar em qualquer
// <img src>/link montado a partir de um caminho relativo vindo da API (logos, mídia etc.).
export function urlPublica(caminho: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  return `${base}${caminho}`;
}

export type ContaSocial = {
  id: string;
  rede: string;
  rotuloCustom: string | null;
  credenciais: Record<string, string> | null;
  status: string;
};

export type Empresa = {
  id: string;
  nome: string;
  nicho: string | null;
  tomDeVoz: string | null;
  logoUrl: string | null;
  createdAt: string;
  contasSociais: ContaSocial[];
};

export type CalendarioItem = {
  id: string;
  empresaId: string;
  dataHora: string;
  tipoPost: string;
  briefing: string | null;
  status: string;
  aprovacaoAutomatica: boolean;
  redesAlvo: string[];
  ultimoErro: string | null;
  empresa: { nome: string; logoUrl: string | null; contasSociais: { rede: string; status: string }[] };
  conteudos?: {
    id: string;
    texto: string | null;
    metadata?: ConteudoMetadata | null;
    publicacoes: {
      id: string;
      rede: string;
      status: string;
      externalPostId: string | null;
      log: string | null;
      link: string | null;
      createdAt: string;
    }[];
  }[];
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

export type ConteudoMetadata = {
  hashtags?: string[];
  cta?: string;
  promptImagem?: string;
  promptImagens?: string[];
  slidesEducativo?: {
    tipo?: string;
    titulo?: string;
    texto?: string;
    badge?: string;
    promptFoto?: string;
    corOverride?: string;
  }[];
  roteiroVideo?: string;
  notasAgentesCustomizados?: { agente: string; nota: string }[];
  ultimaRevisao?: { versaoRevisada: number; aprovado: boolean; observacoes: string; revisadoEm: string };
};

export type MensagemChat = { role: "user" | "assistant"; content: string };

export type Conteudo = {
  id: string;
  calendarioId: string;
  texto: string | null;
  midiaUrls: string[];
  metadata?: ConteudoMetadata | null;
  versao: number;
  aprovadoPor: string | null;
  aprovadoEm: string | null;
  createdAt: string;
  calendario: {
    tipoPost: string;
    dataHora: string;
    status: string;
    redesAlvo: string[];
    empresa: {
      nome: string;
      logoUrl: string | null;
      contasSociais: { rede: string; status: string }[];
    };
  };
  publicacoes: { id: string; rede: string; status: string; externalPostId: string | null; link: string | null }[];
};

export type Publicacao = {
  id: string;
  rede: string;
  externalPostId: string | null;
  link: string | null;
  status: string;
  log: string | null;
  createdAt: string;
  conteudo: {
    texto: string | null;
    aprovadoPor: string | null;
    aprovadoEm: string | null;
    calendario: {
      tipoPost: string;
      briefing: string | null;
      empresa: { nome: string; logoUrl: string | null };
    };
  };
};

export type ItemAguardandoAprovacao = {
  id: string;
  dataHora: string;
  tipoPost: string;
  briefing: string | null;
  empresa: { nome: string; logoUrl: string | null };
  conteudos: { id: string; texto: string | null }[];
};

export type StatusAtivo = {
  agente: string;
  desde: string;
  descricao: string | null;
};

export type FraseOciosa = {
  id: string;
  texto: string;
  agentes: string[];
  createdAt: string;
};

export type AgenteStats = {
  agente: string;
  totalExecucoes: number;
  custoTokensTotal: number;
  duracaoMsMedia: number | null;
  ultimaExecucao: { status: string; createdAt: string } | null;
};

export type AgenteDefinicao = {
  chave: string | null;
  nome: string;
  descricao: string;
  prompt: string | null;
};

export type AgenteCustomizado = {
  id: string;
  nome: string;
  descricao: string;
  prompt: string;
  ativo: boolean;
  origem: string;
  createdAt: string;
};

export type DashboardStats = {
  empresas: number;
  agentesConfigurados: number;
  postagensAgendadas: number;
  publicadasNoMes: number;
  alertas: number;
  aguardandoAprovacao: number;
  ultimaPublicacao: Publicacao | null;
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

function qs(params: Record<string, string | undefined>) {
  const entradas = Object.entries(params).filter(([, v]) => v);
  if (entradas.length === 0) return "";
  return `?${new URLSearchParams(entradas as [string, string][]).toString()}`;
}

export function getStats(empresaId?: string) {
  return safeFetch<DashboardStats>(`/api/dashboard/stats${qs({ empresaId })}`, {
    empresas: 0,
    agentesConfigurados: 7,
    postagensAgendadas: 0,
    publicadasNoMes: 0,
    alertas: 0,
    aguardandoAprovacao: 0,
    ultimaPublicacao: null,
  });
}

export function getEventos(empresaId?: string) {
  return safeFetch<ExecucaoAgente[]>(`/api/dashboard/eventos${qs({ empresaId })}`, []);
}

export function getAguardandoAprovacao(empresaId?: string) {
  return safeFetch<ItemAguardandoAprovacao[]>(`/api/dashboard/aguardando-aprovacao${qs({ empresaId })}`, []);
}

export function getEmpresas() {
  return safeFetch<Empresa[]>("/api/empresas", []);
}

export type EmpresaInput = {
  nome: string;
  nicho?: string;
  tomDeVoz?: string;
};

async function postJson(path: string, dados: unknown): Promise<{ ok: boolean; erro?: string; dados?: unknown }> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!res.ok) return { ok: false, erro: "Não foi possível salvar." };
    return { ok: true, dados: await res.json() };
  } catch {
    return { ok: false, erro: "Falha de conexão com o backend." };
  }
}

async function patchJson(path: string, dados: unknown): Promise<{ ok: boolean; erro?: string; dados?: unknown }> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!res.ok) return { ok: false, erro: "Não foi possível salvar." };
    return { ok: true, dados: await res.json() };
  } catch {
    return { ok: false, erro: "Falha de conexão com o backend." };
  }
}

async function putJson(path: string, dados: unknown): Promise<{ ok: boolean; erro?: string; dados?: unknown }> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!res.ok) return { ok: false, erro: "Não foi possível salvar." };
    return { ok: true, dados: await res.json() };
  } catch {
    return { ok: false, erro: "Falha de conexão com o backend." };
  }
}

export async function criarEmpresa(
  dados: EmpresaInput,
): Promise<{ ok: boolean; erro?: string; empresa?: Empresa }> {
  const resultado = await postJson("/api/empresas", dados);
  return { ...resultado, empresa: resultado.dados as Empresa | undefined };
}

export function atualizarEmpresa(id: string, dados: Partial<EmpresaInput>) {
  return patchJson(`/api/empresas/${id}`, dados);
}

export async function excluirEmpresa(id: string): Promise<{ ok: boolean }> {
  try {
    const res = await fetch(`${API_URL}/api/empresas/${id}`, { method: "DELETE" });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

export async function enviarLogoEmpresa(
  id: string,
  arquivo: File,
): Promise<{ ok: boolean; erro?: string }> {
  try {
    const form = new FormData();
    form.append("logo", arquivo);
    const res = await fetch(`${API_URL}/api/empresas/${id}/logo`, { method: "POST", body: form });
    if (!res.ok) return { ok: false, erro: "Não foi possível enviar a imagem." };
    return { ok: true };
  } catch {
    return { ok: false, erro: "Falha de conexão com o backend." };
  }
}

export type ContaSocialInput = {
  empresaId: string;
  rede: string;
  rotuloCustom?: string;
  credenciais?: Record<string, string>;
  status?: string;
};

export async function criarContaSocial(
  dados: ContaSocialInput,
): Promise<{ ok: boolean; erro?: string; conta?: ContaSocial }> {
  const resultado = await postJson("/api/contas-sociais", dados);
  return { ...resultado, conta: resultado.dados as ContaSocial | undefined };
}

export async function atualizarContaSocial(
  id: string,
  dados: Partial<Omit<ContaSocialInput, "empresaId">>,
): Promise<{ ok: boolean; erro?: string; conta?: ContaSocial }> {
  const resultado = await patchJson(`/api/contas-sociais/${id}`, dados);
  return { ...resultado, conta: resultado.dados as ContaSocial | undefined };
}

export async function excluirContaSocial(id: string): Promise<{ ok: boolean }> {
  try {
    const res = await fetch(`${API_URL}/api/contas-sociais/${id}`, { method: "DELETE" });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

export function getCalendario(empresaId?: string, status?: string) {
  return safeFetch<CalendarioItem[]>(`/api/calendario${qs({ empresaId, status })}`, []);
}

export type CalendarioItemInput = {
  empresaId: string;
  dataHora: string;
  tipoPost: string;
  briefing?: string;
  aprovacaoAutomatica?: boolean;
  redesAlvo?: string[];
};

export async function criarCalendarioItem(
  dados: CalendarioItemInput,
): Promise<{ ok: boolean; erro?: string }> {
  const resultado = await postJson("/api/calendario", dados);
  return { ok: resultado.ok, erro: resultado.erro };
}

export async function atualizarCalendarioItem(
  id: string,
  dados: Partial<Omit<CalendarioItemInput, "empresaId">>,
): Promise<{ ok: boolean; erro?: string }> {
  const resultado = await patchJson(`/api/calendario/${id}`, dados);
  return { ok: resultado.ok, erro: resultado.erro };
}

// Reexecuta o CEO pra esse item (usado no "Tentar novamente" de um agendamento com
// erro) — o backend já limpa ultimoErro antes de rodar e regrava se falhar de novo.
export async function executarCalendarioItem(id: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/calendario/${id}/executar`, { method: "POST" });
    const corpo = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, erro: corpo?.error ?? "Não foi possível executar novamente." };
    return { ok: true };
  } catch {
    return { ok: false, erro: "Falha de conexão com o backend." };
  }
}

export async function excluirCalendarioItem(id: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/calendario/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const corpo = await res.json().catch(() => null);
      return { ok: false, erro: corpo?.error ?? "Não foi possível excluir." };
    }
    return { ok: true };
  } catch {
    return { ok: false, erro: "Falha de conexão com o backend." };
  }
}

export function getConteudos(empresaId?: string, tipoPost?: string) {
  return safeFetch<Conteudo[]>(`/api/conteudos${qs({ empresaId, tipoPost })}`, []);
}

export function getPublicacoes(empresaId?: string, rede?: string) {
  return safeFetch<Publicacao[]>(`/api/publicacoes${qs({ empresaId, rede })}`, []);
}

export async function aprovarConteudo(
  id: string,
  aprovadoPor: string,
): Promise<{ ok: boolean; erro?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/conteudos/${id}/aprovar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aprovadoPor }),
    });
    const corpo = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, erro: corpo?.error ?? "Não foi possível aprovar." };
    return { ok: true };
  } catch {
    return { ok: false, erro: "Falha de conexão com o backend." };
  }
}

export function getAgentesStats(empresaId?: string) {
  return safeFetch<AgenteStats[]>(`/api/agentes${qs({ empresaId })}`, []);
}

export function getAgentesDefinicoes() {
  return safeFetch<AgenteDefinicao[]>("/api/agentes/definicoes", []);
}

export async function atualizarSkillAgente(
  chave: string,
  dados: { nome?: string; descricao?: string; prompt?: string },
): Promise<{ ok: boolean; erro?: string }> {
  const resultado = await patchJson(`/api/agentes/definicoes/${chave}`, dados);
  return { ok: resultado.ok, erro: resultado.erro };
}

export async function restaurarSkillAgente(
  chave: string,
): Promise<{ ok: boolean; erro?: string; definicao?: AgenteDefinicao }> {
  const resultado = await postJson(`/api/agentes/definicoes/${chave}/restaurar`, {});
  return { ...resultado, definicao: resultado.dados as AgenteDefinicao | undefined };
}

export async function sugerirMelhoriaSkill(
  chave: string,
  pedido?: string,
): Promise<{ ok: boolean; erro?: string; promptSugerido?: string; explicacao?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/agentes/definicoes/${chave}/sugestao`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pedido }),
    });
    const corpo = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, erro: corpo?.error ?? "Não foi possível gerar sugestão." };
    return { ok: true, promptSugerido: corpo.promptSugerido, explicacao: corpo.explicacao };
  } catch {
    return { ok: false, erro: "Falha de conexão com o backend." };
  }
}

export function getAgentesCustomizados() {
  return safeFetch<AgenteCustomizado[]>("/api/agentes-customizados", []);
}

export async function criarAgenteCustomizado(dados: {
  nome: string;
  descricao: string;
  prompt: string;
}): Promise<{ ok: boolean; erro?: string }> {
  const resultado = await postJson("/api/agentes-customizados", dados);
  return { ok: resultado.ok, erro: resultado.erro };
}

export async function atualizarAgenteCustomizado(
  id: string,
  dados: Partial<{ nome: string; descricao: string; prompt: string; ativo: boolean }>,
): Promise<{ ok: boolean; erro?: string }> {
  const resultado = await patchJson(`/api/agentes-customizados/${id}`, dados);
  return { ok: resultado.ok, erro: resultado.erro };
}

export async function excluirAgenteCustomizado(id: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/agentes-customizados/${id}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, erro: "Não foi possível excluir." };
    return { ok: true };
  } catch {
    return { ok: false, erro: "Falha de conexão com o backend." };
  }
}

export async function gerarRascunhoAgente(
  pedido: string,
): Promise<{ ok: boolean; erro?: string; nome?: string; descricao?: string; prompt?: string }> {
  const resultado = await postJson("/api/agentes-customizados/gerar", { pedido });
  if (!resultado.ok) return { ok: false, erro: resultado.erro };
  const dados = resultado.dados as { nome: string; descricao: string; prompt: string };
  return { ok: true, ...dados };
}

export function getAgenteTimeline(nome: string) {
  return safeFetch<ExecucaoAgente[]>(`/api/agentes/${encodeURIComponent(nome)}/timeline`, []);
}

export function getAgentesStatus() {
  return safeFetch<StatusAtivo[]>("/api/agentes/status", []);
}

export function getFrasesOciosas() {
  return safeFetch<FraseOciosa[]>("/api/frases", []);
}

export async function criarFraseOciosa(
  texto: string,
  agentes: string[],
): Promise<{ ok: boolean; erro?: string }> {
  const resultado = await postJson("/api/frases", { texto, agentes });
  return { ok: resultado.ok, erro: resultado.erro };
}

export async function atualizarFraseOciosa(
  id: string,
  dados: { texto?: string; agentes?: string[] },
): Promise<{ ok: boolean; erro?: string }> {
  const resultado = await patchJson(`/api/frases/${id}`, dados);
  return { ok: resultado.ok, erro: resultado.erro };
}

export async function excluirFraseOciosa(id: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/frases/${id}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, erro: "Não foi possível excluir." };
    return { ok: true };
  } catch {
    return { ok: false, erro: "Falha de conexão com o backend." };
  }
}

export function urlOauthInstagram(contaSocialId: string): string {
  return urlPublica(`/api/oauth/instagram/iniciar/${contaSocialId}`);
}

export function urlOauthLinkedin(contaSocialId: string): string {
  return urlPublica(`/api/oauth/linkedin/iniciar/${contaSocialId}`);
}

export async function atualizarConteudo(id: string, texto: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/conteudos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto }),
    });
    if (!res.ok) return { ok: false, erro: "Não foi possível salvar." };
    return { ok: true };
  } catch {
    return { ok: false, erro: "Falha de conexão com o backend." };
  }
}

export async function enviarMidiaConteudo(
  id: string,
  arquivo: File,
): Promise<{ ok: boolean; erro?: string }> {
  try {
    const form = new FormData();
    form.append("midia", arquivo);
    const res = await fetch(`${API_URL}/api/conteudos/${id}/midia`, { method: "POST", body: form });
    const corpo = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, erro: corpo?.error ?? "Não foi possível enviar o arquivo." };
    return { ok: true };
  } catch {
    return { ok: false, erro: "Falha de conexão com o backend." };
  }
}

export async function atualizarTipoConteudo(id: string, tipoPost: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/conteudos/${id}/tipo`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipoPost }),
    });
    const corpo = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, erro: corpo?.error ?? "Não foi possível trocar o tipo de post." };
    return { ok: true };
  } catch {
    return { ok: false, erro: "Falha de conexão com o backend." };
  }
}

export async function removerMidiaConteudo(id: string, url: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/conteudos/${id}/midia`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const corpo = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, erro: corpo?.error ?? "Não foi possível remover a mídia." };
    return { ok: true };
  } catch {
    return { ok: false, erro: "Falha de conexão com o backend." };
  }
}

export async function regenerarMidiaConteudo(id: string, indice: number): Promise<{ ok: boolean; erro?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/conteudos/${id}/midia/regenerar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ indice }),
    });
    const corpo = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, erro: corpo?.error ?? "Não foi possível gerar a mídia novamente." };
    return { ok: true };
  } catch {
    return { ok: false, erro: "Falha de conexão com o backend." };
  }
}

export async function dispararRevisao(
  id: string,
): Promise<{ ok: boolean; erro?: string; revisao?: NonNullable<ConteudoMetadata["ultimaRevisao"]> }> {
  try {
    const res = await fetch(`${API_URL}/api/conteudos/${id}/revisao`, { method: "POST" });
    const corpo = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, erro: corpo?.error ?? "Não foi possível rodar a revisão." };
    return { ok: true, revisao: corpo };
  } catch {
    return { ok: false, erro: "Falha de conexão com o backend." };
  }
}

export async function replicarConteudo(
  id: string,
  dados: { empresaId: string; dataHora: string },
): Promise<{ ok: boolean; erro?: string; conteudoId?: string; calendarioId?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/conteudos/${id}/replicar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    const corpo = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, erro: corpo?.error ?? "Não foi possível replicar o conteúdo." };
    return { ok: true, conteudoId: corpo.conteudoId, calendarioId: corpo.calendarioId };
  } catch {
    return { ok: false, erro: "Falha de conexão com o backend." };
  }
}

export async function recriarSlideTurno(
  id: string,
  indice: number,
  mensagens: MensagemChat[],
): Promise<{ ok: boolean; erro?: string; tipo?: "pergunta" | "aplicar"; pergunta?: string; resumo?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/conteudos/${id}/midia/recriar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ indice, mensagens }),
    });
    const corpo = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, erro: corpo?.error ?? "Não foi possível conversar com o Diretor de Arte." };
    return { ok: true, tipo: corpo.tipo, pergunta: corpo.pergunta, resumo: corpo.resumo };
  } catch {
    return { ok: false, erro: "Falha de conexão com o backend." };
  }
}

export async function publicarConteudo(id: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    // A rota de publicar é a única protegida por Basic Auth no nginx (é a única ação
    // irreversível fora do AgentOS) — o valor já vem em base64 "usuario:senha" via env var.
    const auth = process.env.NEXT_PUBLIC_PUBLICAR_BASIC;
    const res = await fetch(`${API_URL}/api/conteudos/${id}/publicar`, {
      method: "POST",
      headers: auth ? { Authorization: `Basic ${auth}` } : undefined,
    });
    const corpo = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, erro: corpo?.error ?? "Não foi possível publicar." };
    return { ok: true };
  } catch {
    return { ok: false, erro: "Falha de conexão com o backend." };
  }
}

export async function publicarConteudoLinkedin(id: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const auth = process.env.NEXT_PUBLIC_PUBLICAR_BASIC;
    const res = await fetch(`${API_URL}/api/conteudos/${id}/publicar-linkedin`, {
      method: "POST",
      headers: auth ? { Authorization: `Basic ${auth}` } : undefined,
    });
    const corpo = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, erro: corpo?.error ?? "Não foi possível publicar." };
    return { ok: true };
  } catch {
    return { ok: false, erro: "Falha de conexão com o backend." };
  }
}

export function getLayoutEscritorio() {
  return safeFetch<LayoutEscritorioDados>("/api/escritorio/layout", LAYOUT_ESCRITORIO_PADRAO);
}

export async function salvarLayoutEscritorio(
  dados: LayoutEscritorioDados,
): Promise<{ ok: boolean; erro?: string }> {
  const resultado = await putJson("/api/escritorio/layout", dados);
  return { ok: resultado.ok, erro: resultado.erro };
}
