const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const MODELO_IMAGEM = process.env.REPLICATE_MODELO ?? "black-forest-labs/flux-schnell";
const MODELO_VIDEO = process.env.REPLICATE_MODELO_VIDEO ?? "pixverse/pixverse-v5.6";

export class ReplicateError extends Error {}

type Predicao = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string | string[];
  error?: string;
  urls?: { get: string };
};

// Compartilhado entre imagem e vídeo: cria a predição, espera concluir (fazendo polling) e
// baixa o binário de saída. Vídeo demora bem mais que imagem (minutos, não segundos), por
// isso tentativas/intervalo são parametrizáveis.
async function rodarPredicaoReplicate(
  modelo: string,
  input: Record<string, unknown>,
  opcoes: { tentativas: number; intervaloMs: number; rotuloErro: string },
): Promise<Buffer> {
  if (!REPLICATE_API_TOKEN) throw new ReplicateError("REPLICATE_API_TOKEN não configurada");

  const criacao = await fetch(`https://api.replicate.com/v1/models/${modelo}/predictions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
    body: JSON.stringify({ input }),
  });
  const predicao = (await criacao.json().catch(() => null)) as (Predicao & { detail?: string }) | null;
  if (!criacao.ok || !predicao) {
    throw new ReplicateError(predicao?.detail ?? `Replicate respondeu ${criacao.status}`);
  }

  const urlConsulta = predicao.urls?.get;
  if (!urlConsulta) throw new ReplicateError("Replicate não retornou URL de consulta da predição.");

  for (let tentativa = 0; tentativa < opcoes.tentativas; tentativa++) {
    const statusRes = await fetch(urlConsulta, { headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` } });
    const statusJson = (await statusRes.json()) as Predicao;

    if (statusJson.status === "succeeded") {
      const saida = Array.isArray(statusJson.output) ? statusJson.output[0] : statusJson.output;
      if (!saida) throw new ReplicateError(`Replicate concluiu mas não retornou nenhum(a) ${opcoes.rotuloErro}.`);
      const arquivoRes = await fetch(saida);
      return Buffer.from(await arquivoRes.arrayBuffer());
    }
    if (statusJson.status === "failed" || statusJson.status === "canceled") {
      throw new ReplicateError(statusJson.error ?? `Geração de ${opcoes.rotuloErro} falhou no Replicate.`);
    }
    await new Promise((resolve) => setTimeout(resolve, opcoes.intervaloMs));
  }
  throw new ReplicateError(`Tempo esgotado aguardando o Replicate gerar ${opcoes.rotuloErro}.`);
}

export async function gerarImagemReplicate(prompt: string): Promise<Buffer> {
  return rodarPredicaoReplicate(
    MODELO_IMAGEM,
    {
      prompt,
      go_fast: true,
      megapixels: "1",
      num_outputs: 1,
      aspect_ratio: "1:1",
      output_format: "jpg",
      output_quality: 80,
      num_inference_steps: 4,
    },
    { tentativas: 30, intervaloMs: 1500, rotuloErro: "a imagem" },
  );
}

// Pixverse v5.6 (texto-pra-vídeo, com áudio nativo: trilha, efeitos e falas — sem precisar de
// um provedor de TTS separado). Configuração fixada na opção mais econômica com boa
// qualidade: 540p custa o mesmo que 360p ($0,07/s), então não faz sentido usar 360p. Duração
// no teto de 10s (máximo do modelo) e formato vertical 9:16 (Reels/Stories).
export async function gerarVideoReplicate(prompt: string): Promise<Buffer> {
  return rodarPredicaoReplicate(
    MODELO_VIDEO,
    {
      prompt,
      quality: "540p",
      duration: 10,
      aspect_ratio: "9:16",
      generate_audio_switch: true,
    },
    // Vídeo demora bem mais que imagem pra gerar — até ~8 min de espera (120 x 4s).
    { tentativas: 120, intervaloMs: 4000, rotuloErro: "o vídeo" },
  );
}
