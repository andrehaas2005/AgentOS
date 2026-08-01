import { gerarTexto as gerarTextoGemini, gerarJson as gerarJsonGemini, GeminiError } from "./geminiClient";
import { gerarTexto as gerarTextoOpenAI, gerarJson as gerarJsonOpenAI, OpenAIError } from "./openaiClient";
import { gerarTexto as gerarTextoAnthropic, gerarJson as gerarJsonAnthropic, AnthropicError } from "./anthropicClient";

// Cadeia de fallback só para erros de COTA (não pra qualquer erro — um prompt malformado
// ou uma resposta inválida deve falhar normalmente, não gastar tentativas nos outros
// provedores). Ordem: Gemini (padrão, mais barato) -> OpenAI -> Anthropic (Claude, último
// recurso). Cada provedor tem seu próprio jeito de reportar "sem cota" — normalizamos aqui.
function ehErroDeCota(erro: unknown): boolean {
  if (erro instanceof GeminiError) {
    return /quota|resource_exhausted|429/i.test(erro.message);
  }
  if (erro instanceof OpenAIError) {
    return erro.status === 429 || erro.tipo === "insufficient_quota" || /quota/i.test(erro.message);
  }
  if (erro instanceof AnthropicError) {
    return erro.status === 429 || erro.tipo === "rate_limit_error" || /quota|rate limit/i.test(erro.message);
  }
  return false;
}

export async function gerarTexto(systemPrompt: string, prompt: string): Promise<string> {
  try {
    return await gerarTextoGemini(systemPrompt, prompt);
  } catch (erroGemini) {
    if (!ehErroDeCota(erroGemini)) throw erroGemini;
    console.warn("Gemini sem cota, tentando OpenAI...", erroGemini);
    try {
      return await gerarTextoOpenAI(systemPrompt, prompt);
    } catch (erroOpenai) {
      if (!ehErroDeCota(erroOpenai)) throw erroOpenai;
      console.warn("OpenAI sem cota, tentando Anthropic (Claude)...", erroOpenai);
      return await gerarTextoAnthropic(systemPrompt, prompt);
    }
  }
}

export async function gerarJson<T>(
  systemPrompt: string,
  prompt: string,
  schema: Record<string, unknown>,
): Promise<T> {
  try {
    return await gerarJsonGemini<T>(systemPrompt, prompt, schema);
  } catch (erroGemini) {
    if (!ehErroDeCota(erroGemini)) throw erroGemini;
    console.warn("Gemini sem cota, tentando OpenAI...", erroGemini);
    const camposObrigatorios = Array.isArray((schema as { required?: unknown }).required)
      ? (schema.required as string[]).join(", ")
      : "";
    const schemaDescricao = `${JSON.stringify(schema)}${
      camposObrigatorios ? ` — TODOS os campos obrigatórios (${camposObrigatorios}) devem estar presentes na resposta, mesmo que vazios.` : ""
    }`;
    try {
      return await gerarJsonOpenAI<T>(systemPrompt, prompt, schemaDescricao);
    } catch (erroOpenai) {
      if (!ehErroDeCota(erroOpenai)) throw erroOpenai;
      console.warn("OpenAI sem cota, tentando Anthropic (Claude)...", erroOpenai);
      return await gerarJsonAnthropic<T>(systemPrompt, prompt, schemaDescricao);
    }
  }
}
