import { prisma } from "../db";
import { marcarAtivo, marcarInativo } from "../agentes/status";
import {
  gerarTexto as gerarTextoGemini,
  gerarJson as gerarJsonGemini,
  GeminiError,
  GeminiJsonInvalidoError,
} from "./geminiClient";
import { gerarTexto as gerarTextoOpenAI, gerarJson as gerarJsonOpenAI, OpenAIError } from "./openaiClient";
import { gerarTexto as gerarTextoAnthropic, gerarJson as gerarJsonAnthropic, AnthropicError } from "./anthropicClient";

// Cadeia de fallback para erros de COTA (um prompt malformado deve falhar normalmente,
// não gastar tentativas nos outros provedores). Ordem: Gemini (padrão, mais barato) ->
// OpenAI -> Anthropic (Claude, último recurso). Cada provedor tem seu próprio jeito de
// reportar "sem cota" — normalizamos aqui.
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

// Diferente de erro de cota: o provedor respondeu normalmente, mas o texto não era um
// JSON válido (acontece mesmo com enforcement de schema). Isso NÃO pode simplesmente
// derrubar o post inteiro pra "erro" — o CEO aciona um Desenvolvedor (temporário, só
// aparece no log dessa tentativa) pra tentar de novo via outro provedor antes de desistir.
function ehErroDeJsonInvalido(erro: unknown): boolean {
  if (erro instanceof GeminiJsonInvalidoError) return true;
  if (erro instanceof OpenAIError) return /JSON inválido/i.test(erro.message);
  return false;
}

// Registra a tentativa de correção como uma execução do "Desenvolvedor" (agente
// temporário, só existe nesse retry) — mesmo padrão de log de `rodarEtapa` em ceo.ts,
// pra aparecer no Feed de Eventos com o resultado real (sucesso ou falha) da correção.
async function comDesenvolvedor<T>(
  empresaId: string | undefined,
  descricao: string,
  executar: () => Promise<T>,
): Promise<T> {
  if (!empresaId) return executar();

  const inicio = Date.now();
  marcarAtivo("Desenvolvedor", descricao);
  try {
    const resultado = await executar();
    await prisma.execucaoAgente.create({
      data: {
        agente: "Desenvolvedor",
        empresaId,
        entrada: { descricao },
        saida: { resultado: "Formato corrigido com sucesso." },
        duracaoMs: Date.now() - inicio,
        status: "sucesso",
      },
    });
    return resultado;
  } catch (erro) {
    await prisma.execucaoAgente.create({
      data: {
        agente: "Desenvolvedor",
        empresaId,
        entrada: { descricao },
        saida: { erro: erro instanceof Error ? erro.message : String(erro) },
        duracaoMs: Date.now() - inicio,
        status: "erro",
      },
    });
    throw erro;
  } finally {
    marcarInativo("Desenvolvedor");
  }
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
  contexto?: { empresaId?: string },
): Promise<T> {
  try {
    return await gerarJsonGemini<T>(systemPrompt, prompt, schema);
  } catch (erroGemini) {
    const jsonInvalido = ehErroDeJsonInvalido(erroGemini);
    if (!ehErroDeCota(erroGemini) && !jsonInvalido) throw erroGemini;

    console.warn(
      jsonInvalido
        ? "Gemini retornou JSON em formato inválido — CEO aciona o Desenvolvedor pra corrigir via OpenAI..."
        : "Gemini sem cota, tentando OpenAI...",
      erroGemini,
    );

    const camposObrigatorios = Array.isArray((schema as { required?: unknown }).required)
      ? (schema.required as string[]).join(", ")
      : "";
    const schemaDescricao = `${JSON.stringify(schema)}${
      camposObrigatorios ? ` — TODOS os campos obrigatórios (${camposObrigatorios}) devem estar presentes na resposta, mesmo que vazios.` : ""
    }`;

    try {
      return await comDesenvolvedor(
        jsonInvalido ? contexto?.empresaId : undefined,
        "Corrigir resposta em formato inválido do Gemini, tentando novamente via OpenAI",
        () => gerarJsonOpenAI<T>(systemPrompt, prompt, schemaDescricao),
      );
    } catch (erroOpenai) {
      const jsonInvalidoOpenai = ehErroDeJsonInvalido(erroOpenai);
      if (!ehErroDeCota(erroOpenai) && !jsonInvalidoOpenai) throw erroOpenai;

      console.warn(
        jsonInvalidoOpenai
          ? "OpenAI também retornou JSON em formato inválido — Desenvolvedor tenta via Anthropic (Claude)..."
          : "OpenAI sem cota, tentando Anthropic (Claude)...",
        erroOpenai,
      );

      return await comDesenvolvedor(
        jsonInvalidoOpenai ? contexto?.empresaId : undefined,
        "Corrigir resposta em formato inválido do OpenAI, tentando novamente via Anthropic (Claude)",
        () => gerarJsonAnthropic<T>(systemPrompt, prompt, schemaDescricao),
      );
    }
  }
}
