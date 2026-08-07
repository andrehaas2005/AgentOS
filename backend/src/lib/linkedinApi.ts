const AUTHORIZE_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const API_URL = "https://api.linkedin.com";
const API_VERSION = process.env.LINKEDIN_API_VERSION ?? "202607";

export class LinkedinApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "LinkedinApiError";
    this.status = status;
  }
}

export type CredenciaisLinkedinApp = {
  linkedin_client_id: string;
  linkedin_client_secret: string;
};

export function montarUrlAutorizacao(credenciais: CredenciaisLinkedinApp, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: credenciais.linkedin_client_id,
    redirect_uri: redirectUri,
    state,
    scope: "openid profile w_member_social email",
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

type TokenResponse = { access_token: string; expires_in: number; error_description?: string };

export async function trocarCodigoPorToken(
  credenciais: CredenciaisLinkedinApp,
  redirectUri: string,
  code: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: credenciais.linkedin_client_id,
    client_secret: credenciais.linkedin_client_secret,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const corpo = (await res.json().catch(() => null)) as TokenResponse | null;
  if (!res.ok || !corpo?.access_token) {
    throw new LinkedinApiError(corpo?.error_description ?? `LinkedIn respondeu ${res.status}`, res.status);
  }
  return { accessToken: corpo.access_token, expiresIn: corpo.expires_in };
}

export type PerfilLinkedin = { sub: string; name: string };

export async function obterPerfil(accessToken: string): Promise<PerfilLinkedin> {
  const res = await fetch(`${API_URL}/v2/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const corpo = (await res.json().catch(() => null)) as (PerfilLinkedin & { message?: string }) | null;
  if (!res.ok || !corpo?.sub) {
    throw new LinkedinApiError(corpo?.message ?? `LinkedIn respondeu ${res.status}`, res.status);
  }
  return corpo;
}

// Registra o upload de uma imagem (Images API) e devolve a URL pra onde enviar o
// binário e a URN da imagem, que depois é referenciada em criarPost.
export async function inicializarUploadImagem(
  accessToken: string,
  authorUrn: string,
): Promise<{ uploadUrl: string; imagemUrn: string }> {
  const res = await fetch(`${API_URL}/rest/images?action=initializeUpload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "LinkedIn-Version": API_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ initializeUploadRequest: { owner: authorUrn } }),
  });

  if (!res.ok) {
    const corpo = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new LinkedinApiError(corpo?.message ?? `LinkedIn respondeu ${res.status}`, res.status);
  }

  const corpo = (await res.json()) as { value: { uploadUrl: string; image: string } };
  return { uploadUrl: corpo.value.uploadUrl, imagemUrn: corpo.value.image };
}

// PUT do binário da imagem na uploadUrl retornada por inicializarUploadImagem — exige
// o mesmo token OAuth no header Authorization (diferente do upload de vídeo, que não exige).
export async function enviarImagemLinkedin(accessToken: string, uploadUrl: string, imagem: Buffer): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "image/jpeg",
    },
    body: imagem,
  });
  if (!res.ok) {
    throw new LinkedinApiError(`Falha ao enviar a imagem para o LinkedIn (status ${res.status}).`, res.status);
  }
}

// Registra o upload de um vídeo (Video API) — diferente de imagem, exige o tamanho do
// arquivo antecipadamente e devolve uma ou mais uploadInstructions (uma por "chunk" do
// arquivo; vídeos curtos como os gerados aqui normalmente vêm com só uma).
export async function inicializarUploadVideo(
  accessToken: string,
  authorUrn: string,
  fileSizeBytes: number,
): Promise<{
  uploadInstructions: { uploadUrl: string; firstByte: number; lastByte: number }[];
  videoUrn: string;
  uploadToken: string;
}> {
  const res = await fetch(`${API_URL}/rest/videos?action=initializeUpload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "LinkedIn-Version": API_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ initializeUploadRequest: { owner: authorUrn, fileSizeBytes } }),
  });

  if (!res.ok) {
    const corpo = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new LinkedinApiError(corpo?.message ?? `LinkedIn respondeu ${res.status}`, res.status);
  }

  const corpo = (await res.json()) as {
    value: {
      uploadInstructions: { uploadUrl: string; firstByte: number; lastByte: number }[];
      video: string;
      uploadToken: string;
    };
  };
  return {
    uploadInstructions: corpo.value.uploadInstructions,
    videoUrn: corpo.value.video,
    uploadToken: corpo.value.uploadToken,
  };
}

// PUT de um trecho ("chunk") do vídeo na uploadUrl correspondente — diferente de imagem,
// NÃO leva o header Authorization (a uploadUrl já vem assinada). Devolve o ETag da
// resposta, exigido depois no finalizeUpload pra identificar cada trecho enviado.
export async function enviarChunkVideoLinkedin(uploadUrl: string, chunk: Buffer): Promise<string> {
  const res = await fetch(uploadUrl, { method: "PUT", body: chunk });
  if (!res.ok) {
    throw new LinkedinApiError(`Falha ao enviar um trecho do vídeo para o LinkedIn (status ${res.status}).`, res.status);
  }
  const etag = res.headers.get("etag") ?? res.headers.get("ETag");
  if (!etag) throw new LinkedinApiError("O LinkedIn não retornou o ETag do trecho de vídeo enviado.");
  return etag;
}

// Fecha o upload depois que todos os chunks foram enviados — só a partir daqui o LinkedIn
// começa a processar/transcodificar o vídeo.
export async function finalizarUploadVideo(
  accessToken: string,
  videoUrn: string,
  uploadToken: string,
  uploadedPartIds: string[],
): Promise<void> {
  const res = await fetch(`${API_URL}/rest/videos?action=finalizeUpload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "LinkedIn-Version": API_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ finalizeUploadRequest: { video: videoUrn, uploadToken, uploadedPartIds } }),
  });
  if (!res.ok) {
    const corpo = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new LinkedinApiError(corpo?.message ?? `LinkedIn respondeu ${res.status}`, res.status);
  }
}

// Vídeo precisa terminar de processar (transcodificar) no LinkedIn antes de poder ser
// referenciado num post — análogo ao aguardarContainerPronto do Instagram.
export async function consultarStatusVideoLinkedin(accessToken: string, videoUrn: string): Promise<string> {
  const res = await fetch(`${API_URL}/rest/videos/${encodeURIComponent(videoUrn)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "LinkedIn-Version": API_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });
  if (!res.ok) {
    throw new LinkedinApiError(`LinkedIn respondeu ${res.status} ao consultar status do vídeo.`, res.status);
  }
  const corpo = (await res.json()) as { status?: string };
  return corpo.status ?? "UNKNOWN";
}

// Escopo: posts de texto no feed pessoal, com imagem única, múltiplas (multiImage) ou um
// único vídeo — mediaUrns leva a(s) URN(s) de imagem OU (nunca junto) a URN do vídeo já
// processado; a Posts API referencia os dois tipos da mesma forma via content.media.id.
// A Posts API exige o header LinkedIn-Version (formato YYYYMM) e retorna o id do post
// criado no header x-restli-id (corpo da resposta 201 vem vazio).
export async function criarPost(
  accessToken: string,
  authorUrn: string,
  texto: string,
  mediaUrns?: string[],
): Promise<string> {
  const body: Record<string, unknown> = {
    author: authorUrn,
    commentary: texto,
    visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };
  if (mediaUrns && mediaUrns.length > 1) {
    body.content = { multiImage: { images: mediaUrns.map((id) => ({ id })) } };
  } else if (mediaUrns && mediaUrns.length === 1) {
    body.content = { media: { id: mediaUrns[0] } };
  }

  const res = await fetch(`${API_URL}/rest/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "LinkedIn-Version": API_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const corpo = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new LinkedinApiError(corpo?.message ?? `LinkedIn respondeu ${res.status}`, res.status);
  }

  const postId = res.headers.get("x-restli-id") ?? res.headers.get("x-linkedin-id");
  if (!postId) throw new LinkedinApiError("O LinkedIn não retornou o ID do post criado.");
  return postId;
}
