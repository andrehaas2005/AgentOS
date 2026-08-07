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

type DebugTokenResposta = {
  data?: {
    granular_scopes?: { scope: string; target_ids?: string[] }[];
  };
};

async function listarPaginaIdsViaGranularScopes(accessToken: string): Promise<string[]> {
  const params = new URLSearchParams({ input_token: accessToken, access_token: accessToken });
  const resposta = await chamarGraph<DebugTokenResposta>(`${GRAPH_URL}/debug_token?${params.toString()}`).catch(
    () => null,
  );
  const escopoPaginas = resposta?.data?.granular_scopes?.find((e) => e.scope === "pages_show_list");
  return escopoPaginas?.target_ids ?? [];
}

async function buscarPaginaPorId(pageId: string, accessToken: string): Promise<PaginaComInstagram | null> {
  const params = new URLSearchParams({
    fields: "id,name,access_token,instagram_business_account{id,username}",
    access_token: accessToken,
  });
  return chamarGraph<PaginaComInstagram>(`${GRAPH_URL}/${pageId}?${params.toString()}`).catch(() => null);
}

export async function listarPaginasComInstagram(accessToken: string): Promise<PaginaComInstagram[]> {
  const params = new URLSearchParams({
    fields: "id,name,access_token,instagram_business_account{id,username}",
    access_token: accessToken,
  });
  const resposta = await chamarGraph<{ data: PaginaComInstagram[] }>(`${GRAPH_URL}/me/accounts?${params.toString()}`);
  if (resposta.data.length > 0) return resposta.data;

  // Tokens emitidos com "granular scopes" (usuário escolhe páginas específicas na tela de
  // login) fazem /me/accounts voltar vazio por design — buscar direto pelos IDs revelados
  // no debug_token é o único jeito de recuperar essas páginas nesse caso.
  const paginaIds = await listarPaginaIdsViaGranularScopes(accessToken);
  const paginas = await Promise.all(paginaIds.map((id) => buscarPaginaPorId(id, accessToken)));
  return paginas.filter((p): p is PaginaComInstagram => p !== null);
}

export async function listarPermissoesConcedidas(accessToken: string): Promise<{ permission: string; status: string }[]> {
  const params = new URLSearchParams({ access_token: accessToken });
  const resposta = await chamarGraph<{ data: { permission: string; status: string }[] }>(
    `${GRAPH_URL}/me/permissions?${params.toString()}`,
  );
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

// Vídeo (video_curto/reels) — desde 2024 a Graph API não aceita mais media_type "VIDEO"
// pra feed; todo vídeo publicado no Instagram (mesmo os curtos que não são "Reels" no
// sentido de conteúdo) precisa ir como media_type "REELS". share_to_feed=true faz ele
// aparecer tanto na aba Reels quanto no feed/grade normal do perfil.
export async function criarContainerVideo(
  igUserId: string,
  accessToken: string,
  videoUrl: string,
  legenda?: string,
): Promise<string> {
  const params = new URLSearchParams({
    media_type: "REELS",
    video_url: videoUrl,
    share_to_feed: "true",
    access_token: accessToken,
  });
  if (legenda) params.set("caption", legenda);

  const resposta = await chamarGraph<{ id: string }>(`${GRAPH_URL}/${igUserId}/media`, {
    method: "POST",
    body: params,
  });
  return resposta.id;
}

// Container filho de um carrossel — mesma chamada de criarContainerImagem, mas sem
// caption (a legenda vai só no container pai) e com is_carousel_item=true.
export async function criarContainerImagemCarrossel(
  igUserId: string,
  accessToken: string,
  imageUrl: string,
): Promise<string> {
  const params = new URLSearchParams({
    image_url: imageUrl,
    is_carousel_item: "true",
    access_token: accessToken,
  });

  const resposta = await chamarGraph<{ id: string }>(`${GRAPH_URL}/${igUserId}/media`, {
    method: "POST",
    body: params,
  });
  return resposta.id;
}

// Container pai do carrossel — referencia os containers filhos já prontos (FINISHED)
// via `children`. Também precisa aguardar status_code=FINISHED antes de publicar.
export async function criarContainerCarrossel(
  igUserId: string,
  accessToken: string,
  childrenIds: string[],
  legenda?: string,
): Promise<string> {
  const params = new URLSearchParams({
    media_type: "CAROUSEL",
    children: childrenIds.join(","),
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

export async function obterPermalink(mediaId: string, accessToken: string): Promise<string | null> {
  const params = new URLSearchParams({ fields: "permalink", access_token: accessToken });
  const resposta = await chamarGraph<{ permalink?: string }>(`${GRAPH_URL}/${mediaId}?${params.toString()}`).catch(
    () => null,
  );
  return resposta?.permalink ?? null;
}
