const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta";
const MODELO_TEXTO = process.env.GEMINI_MODELO_TEXTO ?? "gemini-flash-latest";
const MODELO_IMAGEM = process.env.GEMINI_MODELO_IMAGEM ?? "gemini-2.5-flash-image";

export class GeminiError extends Error {}

type ParteResposta = { text?: string; inlineData?: { mimeType: string; data: string } };

async function chamarGemini(modelo: string, body: Record<string, unknown>): Promise<{ parts: ParteResposta[] }> {
  if (!GEMINI_API_KEY) throw new GeminiError("GEMINI_API_KEY não configurada");

  const res = await fetch(`${GEMINI_URL}/models/${modelo}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-goog-api-key": GEMINI_API_KEY },
    body: JSON.stringify(body),
  });
  const corpo = (await res.json().catch(() => null)) as {
    candidates?: { content?: { parts?: ParteResposta[] } }[];
    error?: { message: string };
  } | null;

  if (!res.ok || !corpo || corpo.error) {
    throw new GeminiError(corpo?.error?.message ?? `Gemini respondeu ${res.status}`);
  }

  const parts = corpo.candidates?.[0]?.content?.parts ?? [];
  if (parts.length === 0) throw new GeminiError("Gemini não retornou conteúdo.");
  return { parts };
}

export async function gerarTexto(systemPrompt: string, prompt: string): Promise<string> {
  const { parts } = await chamarGemini(MODELO_TEXTO, {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
  return parts
    .map((p) => p.text ?? "")
    .join("")
    .trim();
}

export async function gerarJson<T>(
  systemPrompt: string,
  prompt: string,
  schema: Record<string, unknown>,
): Promise<T> {
  const { parts } = await chamarGemini(MODELO_TEXTO, {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: schema },
  });
  const texto = parts.map((p) => p.text ?? "").join("");
  try {
    return JSON.parse(texto) as T;
  } catch {
    throw new GeminiError(`Gemini retornou JSON inválido: ${texto.slice(0, 300)}`);
  }
}

export async function gerarImagem(prompt: string): Promise<Buffer> {
  const { parts } = await chamarGemini(MODELO_IMAGEM, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
  const imagem = parts.find((p) => p.inlineData);
  if (!imagem?.inlineData) throw new GeminiError("Gemini não retornou nenhuma imagem.");
  return Buffer.from(imagem.inlineData.data, "base64");
}
