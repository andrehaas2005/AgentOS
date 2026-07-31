const GRAPH_VERSION = process.env.META_GRAPH_VERSION ?? "v24.0";
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;
const DIALOG_URL = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;

export class MetaGraphError extends Error {
  codigo?: number;
  subcodigo?: number;

  constructor(message: string, codigo?: number, subcodigo?: number) {
    super(message);
    this.name = "MetaGraphError";
    this.codigo = codigo;
    this.subcodigo = subcodigo;
  }

  get tokenExpirado() {
    return this.codigo === 190;
  }
}

async function chamarGraph<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const corpo = (await res.json().catch(() => null)) as
    | (T & { error?: { message: string; code: number; error_subcode?: number } })
    | null;

  if (!res.ok || !corpo || corpo.error) {
    const erro = corpo?.error;
    throw new MetaGraphError(erro?.message ?? `Graph API respondeu ${res.status}`, erro?.code, erro?.error_subcode);
  }
  return corpo;
}

export type CredenciaisMetaApp = {
  meta_app_id: string;
  meta_app_secret: string;
  meta_config_id?: string;
};

export function montarUrlDialogo(credenciais: CredenciaisMetaApp, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: credenciais.meta_app_id,
    redirect_uri: redirectUri,
    state,
    response_type: "code",
  });

  if (credenciais.meta_config_id) {
    params.set("config_id", credenciais.meta_config_id);
  } else {
    params.set("scope", "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement");
  }

  return `${DIALOG_URL}?${params.toString()}`;
}

type TokenResponse = { access_token: string; token_type?: string; expires_in?: number };

export async function trocarCodigoPorTokenCurto(
  credenciais: CredenciaisMetaApp,
  redirectUri: string,
  code: string,
): Promise<string> {
  const params = new URLSearchParams({
    client_id: credenciais.meta_app_id,
    client_secret: credenciais.meta_app_secret,
    redirect_uri: redirectUri,
    code,
  });
  const resposta = await chamarGraph<TokenResponse>(`${GRAPH_URL}/oauth/access_token?${params.toString()}`);
  return resposta.access_token;
}

export async function trocarPorTokenLongo(credenciais: CredenciaisMetaApp, tokenCurto: string): Promise<string> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: credenciais.meta_app_id,
    client_secret: credenciais.meta_app_secret,
    fb_exchange_token: tokenCurto,
  });
  const resposta = await chamarGraph<TokenResponse>(`${GRAPH_URL}/oauth/access_token?${params.toString()}`);
  return resposta.access_token;
}

export type PaginaComInstagram = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string; username: string };
};

export async function listarPaginasComInstagram(accessToken: string): Promise<PaginaComInstagram[]> {
  const params = new URLSearchParams({
    fields: "id,name,access_token,instagram_business_account{id,username}",
    access_token: accessToken,
  });
  const resposta = await chamarGraph<{ data: PaginaComInstagram[] }>(`${GRAPH_URL}/me/accounts?${params.toString()}`);
  return resposta.data;
}

export async function criarContainerImagem(
  igUserId: string,
  accessToken: string,
  imageUrl: string,
  legenda?: string,
): Promise<string> {
  const params = new URLSearchParams({
    image_url: imageUrl,
    access_token: accessToken,
  });
  if (legenda) params.set("caption", legenda);

  const resposta = await chamarGraph<{ id: string }>(`${GRAPH_URL}/${igUserId}/media`, {
    method: "POST",
    body: params,
  });
  return resposta.id;
}

export async function consultarStatusContainer(containerId: string, accessToken: string): Promise<string> {
  const params = new URLSearchParams({ fields: "status_code", access_token: accessToken });
  const resposta = await chamarGraph<{ status_code: string }>(`${GRAPH_URL}/${containerId}?${params.toString()}`);
  return resposta.status_code;
}

export async function publicarContainer(igUserId: string, accessToken: string, containerId: string): Promise<string> {
  const params = new URLSearchParams({
    creation_id: containerId,
    access_token: accessToken,
  });
  const resposta = await chamarGraph<{ id: string }>(`${GRAPH_URL}/${igUserId}/media_publish`, {
    method: "POST",
    body: params,
  });
  return resposta.id;
}
