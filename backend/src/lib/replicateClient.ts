import { prisma } from "../db";
import { CONFIGURACAO_VIDEO_PADRAO } from "./catalogoModelosVideo";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const MODELO_IMAGEM = process.env.REPLICATE_MODELO ?? "black-forest-labs/flux-schnell";

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

// Diretiva fixa, sempre anexada ao prompt de verdade enviado ao Pixverse — reforço em
// código (não só nas instruções do Diretor de Vídeo) pra garantir que o áudio nativo
// (fala/narração) do vídeo sempre saia em português do Brasil, mesmo se o LLM esquecer.
const DIRETIVA_AUDIO_PT_BR =
  "IMPORTANT: all spoken dialogue, narration and any spoken audio in this video must be in Brazilian Portuguese (pt-BR), never in English or any other language.";

// Alguns campos do catálogo (ex.: fps) usam <select> no front pra restringir as opções, mas
// o valor de verdade que a API do Replicate espera é numérico — string vinda do banco que
// "parece número" (ex.: "24") é convertida; strings de verdade (ex.: "9:16", "540p") ficam
// intactas.
function coagirNumeros(parametros: Record<string, unknown>): Record<string, unknown> {
  const resultado: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(parametros)) {
    resultado[chave] = typeof valor === "string" && valor.trim() !== "" && !Number.isNaN(Number(valor)) ? Number(valor) : valor;
  }
  return resultado;
}

// Modelo e parâmetros de vídeo são configuráveis pela tela de Configurações (singleton
// ConfiguracaoVideo no banco) — trocar de provedor/modelo não exige redeploy, só um PUT
// nessa linha. Sem configuração salva ainda, cai no default do catálogo (Pruna p-video).
export async function gerarVideoReplicate(prompt: string): Promise<Buffer> {
  const configuracao = await prisma.configuracaoVideo.findUnique({ where: { id: "singleton" } });
  const modelo = configuracao?.modelo ?? CONFIGURACAO_VIDEO_PADRAO.modelo;
  const parametros = (configuracao?.parametros as Record<string, unknown> | null) ?? CONFIGURACAO_VIDEO_PADRAO.parametros;

  return rodarPredicaoReplicate(
    modelo,
    {
      ...coagirNumeros(parametros),
      prompt: `${prompt}\n\n${DIRETIVA_AUDIO_PT_BR}`,
    },
    // Vídeo demora bem mais que imagem pra gerar — até ~8 min de espera (120 x 4s).
    { tentativas: 120, intervaloMs: 4000, rotuloErro: "o vídeo" },
  );
}
