import { prisma } from "../db";
import { trocarPorTokenLongo, type CredenciaisMetaApp } from "./metaGraph";

const GRAPH_VERSION = process.env.META_GRAPH_VERSION ?? "v24.0";
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

const DIAS_ANTES_DE_RENOVAR = 10;
const INTERVALO_VERIFICACAO_MS = 24 * 60 * 60 * 1000;

type DebugTokenDados = { data_access_expires_at?: number; expires_at?: number; is_valid?: boolean };

async function obterDataAccessExpiraEm(accessToken: string): Promise<number | null> {
  const params = new URLSearchParams({ input_token: accessToken, access_token: accessToken });
  const res = await fetch(`${GRAPH_URL}/debug_token?${params.toString()}`);
  const corpo = (await res.json().catch(() => null)) as { data?: DebugTokenDados } | null;
  return corpo?.data?.data_access_expires_at ?? null;
}

async function renovarContaSocial(conta: { id: string; credenciais: unknown }) {
  const credenciais = (conta.credenciais as Record<string, string> | null) ?? {};
  const { access_token: accessToken, meta_app_id: metaAppId, meta_app_secret: metaAppSecret } = credenciais;
  if (!accessToken || !metaAppId || !metaAppSecret) return;

  const expiraEm = await obterDataAccessExpiraEm(accessToken);
  if (!expiraEm) return;

  const diasRestantes = (expiraEm * 1000 - Date.now()) / (1000 * 60 * 60 * 24);
  if (diasRestantes > DIAS_ANTES_DE_RENOVAR) return;

  try {
    const novoToken = await trocarPorTokenLongo(credenciais as unknown as CredenciaisMetaApp, accessToken);
    await prisma.contaSocial.update({
      where: { id: conta.id },
      data: {
        credenciais: { ...credenciais, access_token: novoToken, token_obtido_em: new Date().toISOString() },
      },
    });
    console.log(`Token renovado automaticamente para ContaSocial ${conta.id}`);
  } catch (erro) {
    console.error(`Falha ao renovar token da ContaSocial ${conta.id} — requer reconexão manual:`, erro);
    await prisma.contaSocial.update({ where: { id: conta.id }, data: { status: "expirado" } }).catch(() => null);
  }
}

async function verificarTodasAsContas() {
  const contas = await prisma.contaSocial.findMany({
    where: { rede: { in: ["instagram", "facebook"] }, status: "conectado" },
  });
  for (const conta of contas) {
    await renovarContaSocial(conta).catch((erro) => console.error("Erro ao renovar token:", erro));
  }
}

export function iniciarRenovacaoAutomaticaDeTokens() {
  verificarTodasAsContas().catch((erro) => console.error("Erro na verificação inicial de tokens:", erro));
  setInterval(() => {
    verificarTodasAsContas().catch((erro) => console.error("Erro na verificação periódica de tokens:", erro));
  }, INTERVALO_VERIFICACAO_MS);
}
