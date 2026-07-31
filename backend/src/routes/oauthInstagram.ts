import { Router } from "express";
import { prisma } from "../db";
import { assinarEstado, verificarEstado } from "../lib/estadoOauth";
import {
  montarUrlDialogo,
  trocarCodigoPorTokenCurto,
  trocarPorTokenLongo,
  listarPaginasComInstagram,
  MetaGraphError,
  type CredenciaisMetaApp,
} from "../lib/metaGraph";

export const oauthInstagramRouter = Router();

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL ?? "http://localhost:4000";
const REDIRECT_URI = `${PUBLIC_BASE_URL}/api/oauth/instagram/callback`;

function redirecionarComErro(res: import("express").Response, codigo: string) {
  res.redirect(`${PUBLIC_BASE_URL}/empresas?erro=${codigo}`);
}

oauthInstagramRouter.get("/iniciar/:contaSocialId", async (req, res) => {
  const conta = await prisma.contaSocial.findUnique({ where: { id: req.params.contaSocialId } });
  if (!conta || conta.rede !== "instagram") {
    return redirecionarComErro(res, "conta_invalida");
  }

  const credenciais = (conta.credenciais as Record<string, string> | null) ?? {};
  if (!credenciais.meta_app_id) {
    return redirecionarComErro(res, "app_nao_configurado");
  }

  const state = assinarEstado(conta.id);
  const url = montarUrlDialogo(credenciais as unknown as CredenciaisMetaApp, REDIRECT_URI, state);
  res.redirect(url);
});

oauthInstagramRouter.get("/callback", async (req, res) => {
  const { code, state, error, error_reason: errorReason } = req.query;

  if (error || errorReason) {
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
  if (!conta || conta.rede !== "instagram") {
    return redirecionarComErro(res, "conta_invalida");
  }

  const credenciaisAtuais = (conta.credenciais as Record<string, string> | null) ?? {};
  if (!credenciaisAtuais.meta_app_id || !credenciaisAtuais.meta_app_secret) {
    return redirecionarComErro(res, "app_nao_configurado");
  }
  const credenciaisApp = credenciaisAtuais as unknown as CredenciaisMetaApp;

  try {
    const tokenCurto = await trocarCodigoPorTokenCurto(credenciaisApp, REDIRECT_URI, code);
    const tokenLongo = await trocarPorTokenLongo(credenciaisApp, tokenCurto);
    const paginas = await listarPaginasComInstagram(tokenLongo);
    const paginaComInstagram = paginas.find((p) => p.instagram_business_account);

    if (!paginaComInstagram?.instagram_business_account) {
      console.error(
        "sem_paginas_instagram — /me/accounts retornou:",
        JSON.stringify(paginas.map((p) => ({ id: p.id, name: p.name, instagram_business_account: p.instagram_business_account }))),
      );
      return redirecionarComErro(res, "sem_paginas_instagram");
    }

    await prisma.contaSocial.update({
      where: { id: conta.id },
      data: {
        status: "conectado",
        credenciais: {
          ...credenciaisAtuais,
          access_token: paginaComInstagram.access_token,
          ig_user_id: paginaComInstagram.instagram_business_account.id,
          ig_username: paginaComInstagram.instagram_business_account.username,
          page_id: paginaComInstagram.id,
          page_nome: paginaComInstagram.name,
          token_obtido_em: new Date().toISOString(),
        },
      },
    });

    res.redirect(`${PUBLIC_BASE_URL}/empresas?instagram=conectado`);
  } catch (erro) {
    console.error("Erro no callback OAuth do Instagram:", erro instanceof MetaGraphError ? erro.message : erro);
    redirecionarComErro(res, "falha_meta");
  }
});
