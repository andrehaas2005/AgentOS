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

// Escopo v1: apenas posts de texto no feed pessoal — sem imagem, sem carrossel/vídeo.
// A Posts API do LinkedIn exige o header LinkedIn-Version (formato YYYYMM) e retorna o
// id do post criado no header x-restli-id (corpo da resposta 201 vem vazio).
export async function criarPost(accessToken: string, authorUrn: string, texto: string): Promise<string> {
  const res = await fetch(`${API_URL}/rest/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "LinkedIn-Version": API_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      author: authorUrn,
      commentary: texto,
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });

  if (!res.ok) {
    const corpo = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new LinkedinApiError(corpo?.message ?? `LinkedIn respondeu ${res.status}`, res.status);
  }

  const postId = res.headers.get("x-restli-id") ?? res.headers.get("x-linkedin-id");
  if (!postId) throw new LinkedinApiError("O LinkedIn não retornou o ID do post criado.");
  return postId;
}
