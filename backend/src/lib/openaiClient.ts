import { extrairJson } from "./extrairJson";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODELO_TEXTO = process.env.OPENAI_MODELO_TEXTO ?? "gpt-4o-mini";

export class OpenAIError extends Error {
  status?: number;
  tipo?: string;

  constructor(message: string, status?: number, tipo?: string) {
    super(message);
    this.name = "OpenAIError";
    this.status = status;
    this.tipo = tipo;
  }
}

async function chamarOpenAI(mensagens: { role: string; content: string }[]): Promise<string> {
  if (!OPENAI_API_KEY) throw new OpenAIError("OPENAI_API_KEY não configurada");

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: MODELO_TEXTO, messages: mensagens }),
  });
  const corpo = (await res.json().catch(() => null)) as {
    choices?: { message?: { content?: string } }[];
    error?: { message: string; type?: string };
  } | null;

  if (!res.ok || !corpo || corpo.error) {
    throw new OpenAIError(corpo?.error?.message ?? `OpenAI respondeu ${res.status}`, res.status, corpo?.error?.type);
  }

  const texto = corpo.choices?.[0]?.message?.content;
  if (!texto) throw new OpenAIError("OpenAI não retornou conteúdo.");
  return texto;
}

export async function gerarTexto(systemPrompt: string, prompt: string): Promise<string> {
  const texto = await chamarOpenAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ]);
  return texto.trim();
}

// Sem enforcement de schema estruturado (pra não precisar converter o dialeto do
// schema do Gemini pra JSON Schema padrão) — pede o JSON explicitamente no prompt e
// faz parse defensivo, removendo blocos de código markdown se o modelo os usar.
export async function gerarJson<T>(systemPrompt: string, prompt: string, schemaDescricao: string): Promise<T> {
  const texto = await chamarOpenAI([
    {
      role: "system",
      content: `${systemPrompt}\n\nResponda SOMENTE com um JSON válido (sem markdown, sem texto antes ou depois) seguindo este formato: ${schemaDescricao}`,
    },
    { role: "user", content: prompt },
  ]);
  const limpo = extrairJson(texto);
  try {
    return JSON.parse(limpo) as T;
  } catch {
    throw new OpenAIError(`OpenAI retornou JSON inválido: ${limpo.slice(0, 300)}`);
  }
}

export type MensagemChat = { role: "user" | "assistant"; content: string };

// Variante multi-turno de gerarJson — usada por fluxos de chat, onde o histórico inteiro
// precisa ir a cada chamada porque a API não mantém estado de conversa entre requisições.
export async function gerarJsonChat<T>(
  systemPrompt: string,
  mensagens: MensagemChat[],
  schemaDescricao: string,
): Promise<T> {
  const texto = await chamarOpenAI([
    {
      role: "system",
      content: `${systemPrompt}\n\nResponda SOMENTE com um JSON válido (sem markdown, sem texto antes ou depois) seguindo este formato: ${schemaDescricao}`,
    },
    ...mensagens,
  ]);
  const limpo = extrairJson(texto);
  try {
    return JSON.parse(limpo) as T;
  } catch {
    throw new OpenAIError(`OpenAI retornou JSON inválido: ${limpo.slice(0, 300)}`);
  }
}
