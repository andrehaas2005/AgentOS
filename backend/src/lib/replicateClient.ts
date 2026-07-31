const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const MODELO = process.env.REPLICATE_MODELO ?? "black-forest-labs/flux-schnell";

export class ReplicateError extends Error {}

type Predicao = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string | string[];
  error?: string;
  urls?: { get: string };
};

export async function gerarImagemReplicate(prompt: string): Promise<Buffer> {
  if (!REPLICATE_API_TOKEN) throw new ReplicateError("REPLICATE_API_TOKEN não configurada");

  const criacao = await fetch(`https://api.replicate.com/v1/models/${MODELO}/predictions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
    body: JSON.stringify({
      input: {
        prompt,
        go_fast: true,
        megapixels: "1",
        num_outputs: 1,
        aspect_ratio: "1:1",
        output_format: "jpg",
        output_quality: 80,
        num_inference_steps: 4,
      },
    }),
  });
  const predicao = (await criacao.json().catch(() => null)) as (Predicao & { detail?: string }) | null;
  if (!criacao.ok || !predicao) {
    throw new ReplicateError(predicao?.detail ?? `Replicate respondeu ${criacao.status}`);
  }

  const urlConsulta = predicao.urls?.get;
  if (!urlConsulta) throw new ReplicateError("Replicate não retornou URL de consulta da predição.");

  const TENTATIVAS = 30;
  const INTERVALO_MS = 1500;
  for (let tentativa = 0; tentativa < TENTATIVAS; tentativa++) {
    const statusRes = await fetch(urlConsulta, { headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` } });
    const statusJson = (await statusRes.json()) as Predicao;

    if (statusJson.status === "succeeded") {
      const saida = Array.isArray(statusJson.output) ? statusJson.output[0] : statusJson.output;
      if (!saida) throw new ReplicateError("Replicate concluiu mas não retornou nenhuma imagem.");
      const imagemRes = await fetch(saida);
      return Buffer.from(await imagemRes.arrayBuffer());
    }
    if (statusJson.status === "failed" || statusJson.status === "canceled") {
      throw new ReplicateError(statusJson.error ?? "Geração de imagem falhou no Replicate.");
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVALO_MS));
  }
  throw new ReplicateError("Tempo esgotado aguardando o Replicate gerar a imagem.");
}
