import crypto from "crypto";

const SEGREDO = process.env.OAUTH_STATE_SECRET ?? "dev-secret-troque-em-producao";
const VALIDADE_MS = 10 * 60 * 1000;

function assinar(payload: string): string {
  return crypto.createHmac("sha256", SEGREDO).update(payload).digest("hex");
}

export function assinarEstado(contaSocialId: string): string {
  const payload = `${contaSocialId}.${Date.now()}`;
  const assinatura = assinar(payload);
  return Buffer.from(`${payload}.${assinatura}`).toString("base64url");
}

export function verificarEstado(estado: string): string | null {
  try {
    const decodificado = Buffer.from(estado, "base64url").toString("utf8");
    const [contaSocialId, timestampStr, assinatura] = decodificado.split(".");
    if (!contaSocialId || !timestampStr || !assinatura) return null;

    const payload = `${contaSocialId}.${timestampStr}`;
    const assinaturaEsperada = assinar(payload);
    if (assinatura.length !== assinaturaEsperada.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(assinatura), Buffer.from(assinaturaEsperada))) return null;

    const timestamp = Number(timestampStr);
    if (!Number.isFinite(timestamp) || Date.now() - timestamp > VALIDADE_MS) return null;

    return contaSocialId;
  } catch {
    return null;
  }
}
