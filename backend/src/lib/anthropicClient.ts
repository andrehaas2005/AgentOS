import { extrairJson } from "./extrairJson";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODELO_TEXTO = process.env.ANTHROPIC_MODELO_TEXTO ?? "claude-sonnet-5";
const MAX_TOKENS = 4096;

export class AnthropicError extends Error {
  status?: number;
  tipo?: string;

  constructor(message: string, status?: number, tipo?: string) {
    super(message);
    this.name = "AnthropicError";
    this.status = status;
    this.tipo = tipo;
  }
}

export type MensagemChat = { role: "user" | "assistant"; content: string };

async function chamarAnthropicMensagens(systemPrompt: string, mensagens: MensagemChat[]): Promise<string> {
  if (!ANTHROPIC_API_KEY) throw new AnthropicError("ANTHROPIC_API_KEY não configurada");

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODELO_TEXTO,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: mensagens,
    }),
  });
  const corpo = (await res.json().catch(() => null)) as {
    content?: { type: string; text?: string }[];
    error?: { message: string; type?: string };
  } | null;

  if (!res.ok || !corpo || corpo.error) {
    throw new AnthropicError(corpo?.error?.message ?? `Anthropic respondeu ${res.status}`, res.status, corpo?.error?.type);
  }

  const texto = corpo.content?.find((c) => c.type === "text")?.text;
  if (!texto) throw new AnthropicError("Anthropic não retornou conteúdo.");
  return texto;
}

async function chamarAnthropic(systemPrompt: string, prompt: string): Promise<string> {
  return chamarAnthropicMensagens(systemPrompt, [{ role: "user", content: prompt }]);
}

export async function gerarTexto(systemPrompt: string, prompt: string): Promise<string> {
  const texto = await chamarAnthropic(systemPrompt, prompt);
  return texto.trim();
}

// Mesma estratégia do openaiClient — pede o JSON no prompt e faz parse defensivo, sem
// enforcement de schema estruturado.
export async function gerarJson<T>(systemPrompt: string, prompt: string, schemaDescricao: string): Promise<T> {
  const texto = await chamarAnthropic(
    `${systemPrompt}\n\nResponda SOMENTE com um JSON válido (sem markdown, sem texto antes ou depois) seguindo este formato: ${schemaDescricao}`,
    prompt,
  );
  const limpo = extrairJson(texto);
  try {
    return JSON.parse(limpo) as T;
  } catch {
    throw new AnthropicError(`Anthropic retornou JSON inválido: ${limpo.slice(0, 300)}`);
  }
}

// Variante multi-turno de gerarJson — usada por fluxos de chat, onde o histórico inteiro
// precisa ir a cada chamada porque a API não mantém estado de conversa entre requisições.
export async function gerarJsonChat<T>(
  systemPrompt: string,
  mensagens: MensagemChat[],
  schemaDescricao: string,
): Promise<T> {
  const texto = await chamarAnthropicMensagens(
    `${systemPrompt}\n\nResponda SOMENTE com um JSON válido (sem markdown, sem texto antes ou depois) seguindo este formato: ${schemaDescricao}`,
    mensagens,
  );
  const limpo = extrairJson(texto);
  try {
    return JSON.parse(limpo) as T;
  } catch {
    throw new AnthropicError(`Anthropic retornou JSON inválido: ${limpo.slice(0, 300)}`);
  }
}
