import crypto from "crypto";

// Token de sessão simples e sem estado (sem tabela no banco): payload assinado com HMAC,
// mesmo formato usado pelo backend (backend/src/lib/sessao.ts) — os dois compartilham o
// SESSION_SECRET via variável de ambiente. O login roda aqui (dashboard/app/auth/login), o
// backend só valida o cookie que este arquivo emite.
const SEGREDO = process.env.SESSION_SECRET ?? "";
const DURACAO_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

export const NOME_COOKIE_SESSAO = "agentos_sessao";
export const DURACAO_COOKIE_SEGUNDOS = DURACAO_MS / 1000;

export function criarTokenSessao(): string {
  const exp = Date.now() + DURACAO_MS;
  const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  const assinatura = crypto.createHmac("sha256", SEGREDO).update(payload).digest("base64url");
  return `${payload}.${assinatura}`;
}

export function tokenSessaoValido(token: string | undefined | null): boolean {
  if (!token || !SEGREDO) return false;
  const partes = token.split(".");
  if (partes.length !== 2) return false;
  const [payload, assinatura] = partes;

  const esperada = crypto.createHmac("sha256", SEGREDO).update(payload).digest("base64url");
  const bufAssinatura = Buffer.from(assinatura);
  const bufEsperada = Buffer.from(esperada);
  if (bufAssinatura.length !== bufEsperada.length) return false;
  if (!crypto.timingSafeEqual(bufAssinatura, bufEsperada)) return false;

  try {
    const dados = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number };
    return typeof dados.exp === "number" && dados.exp > Date.now();
  } catch {
    return false;
  }
}
