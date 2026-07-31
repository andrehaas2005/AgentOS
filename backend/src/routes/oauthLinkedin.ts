import { Router } from "express";
import { prisma } from "../db";
import { assinarEstado, verificarEstado } from "../lib/estadoOauth";
import {
  montarUrlAutorizacao,
  trocarCodigoPorToken,
  obterPerfil,
  LinkedinApiError,
  type CredenciaisLinkedinApp,
} from "../lib/linkedinApi";

export const oauthLinkedinRouter = Router();

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL ?? "http://localhost:4000";
const REDIRECT_URI = `${PUBLIC_BASE_URL}/api/oauth/linkedin/callback`;

function redirecionarComErro(res: import("express").Response, codigo: string) {
  res.redirect(`${PUBLIC_BASE_URL}/empresas?erro=${codigo}`);
}

oauthLinkedinRouter.get("/iniciar/:contaSocialId", async (req, res) => {
  const conta = await prisma.contaSocial.findUnique({ where: { id: req.params.contaSocialId } });
  if (!conta || conta.rede !== "linkedin") {
    return redirecionarComErro(res, "conta_invalida");
  }

  const credenciais = (conta.credenciais as Record<string, string> | null) ?? {};
  if (!credenciais.linkedin_client_id) {
    return redirecionarComErro(res, "app_nao_configurado");
  }

  const state = assinarEstado(conta.id);
  const url = montarUrlAutorizacao(credenciais as unknown as CredenciaisLinkedinApp, REDIRECT_URI, state);
  res.redirect(url);
});

oauthLinkedinRouter.get("/callback", async (req, res) => {
  const { code, state, error, error_description: errorDescription } = req.query;

  if (error || errorDescription) {
    return redirecionarComErro(res, "cancelado_pelo_usuario");
  }
  if (typeof code !== "string" || typeof state !== "string") {
    return redirecionarComErro(res, "requisicao_invalida");
  }

  const contaSocialId = verificarEstado(state);
  if (!contaSocialId) {
    return redirecionarComErro(res, "estado_invalido");
  }

  const conta = await prisma.contaSocial.findUnique({ where: { id: contaSocialId } });
  if (!conta || conta.rede !== "linkedin") {
    return redirecionarComErro(res, "conta_invalida");
  }

  const credenciaisAtuais = (conta.credenciais as Record<string, string> | null) ?? {};
  if (!credenciaisAtuais.linkedin_client_id || !credenciaisAtuais.linkedin_client_secret) {
    return redirecionarComErro(res, "app_nao_configurado");
  }
  const credenciaisApp = credenciaisAtuais as unknown as CredenciaisLinkedinApp;

  try {
    const { accessToken, expiresIn } = await trocarCodigoPorToken(credenciaisApp, REDIRECT_URI, code);
    const perfil = await obterPerfil(accessToken);

    await prisma.contaSocial.update({
      where: { id: conta.id },
      data: {
        status: "conectado",
        credenciais: {
          ...credenciaisAtuais,
          access_token: accessToken,
          linkedin_sub: perfil.sub,
          linkedin_nome: perfil.name,
          token_expira_em: new Date(Date.now() + expiresIn * 1000).toISOString(),
          token_obtido_em: new Date().toISOString(),
        },
      },
    });

    res.redirect(`${PUBLIC_BASE_URL}/empresas?linkedin=conectado`);
  } catch (erro) {
    console.error("Erro no callback OAuth do LinkedIn:", erro instanceof LinkedinApiError ? erro.message : erro);
    redirecionarComErro(res, "falha_linkedin");
  }
});
