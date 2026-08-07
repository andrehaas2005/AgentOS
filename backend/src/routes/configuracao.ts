import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db";
import { MODELOS_VIDEO, encontrarModeloVideo, CONFIGURACAO_VIDEO_PADRAO } from "../lib/catalogoModelosVideo";

export const configuracaoRouter = Router();

const ID_SINGLETON = "singleton";

configuracaoRouter.get("/video", async (_req, res) => {
  const existente = await prisma.configuracaoVideo.findUnique({ where: { id: ID_SINGLETON } });
  const configuracao =
    existente ??
    (await prisma.configuracaoVideo.create({
      data: {
        id: ID_SINGLETON,
        modelo: CONFIGURACAO_VIDEO_PADRAO.modelo,
        parametros: CONFIGURACAO_VIDEO_PADRAO.parametros as Prisma.InputJsonValue,
      },
    }));

  res.json({ modelo: configuracao.modelo, parametros: configuracao.parametros, catalogo: MODELOS_VIDEO });
});

const configuracaoVideoInput = z.object({
  modelo: z.string(),
  parametros: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

configuracaoRouter.put("/video", async (req, res) => {
  const parsed = configuracaoVideoInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const modeloDoCatalogo = encontrarModeloVideo(parsed.data.modelo);
  if (!modeloDoCatalogo) {
    return res.status(400).json({ error: `Modelo "${parsed.data.modelo}" não está no catálogo.` });
  }
  const chavesValidas = new Set(modeloDoCatalogo.campos.map((c) => c.chave));
  for (const chave of Object.keys(parsed.data.parametros)) {
    if (!chavesValidas.has(chave)) {
      return res.status(400).json({ error: `Parâmetro "${chave}" não existe no modelo "${parsed.data.modelo}".` });
    }
  }

  const parametrosJson = parsed.data.parametros as Prisma.InputJsonValue;
  const atualizado = await prisma.configuracaoVideo.upsert({
    where: { id: ID_SINGLETON },
    create: { id: ID_SINGLETON, modelo: parsed.data.modelo, parametros: parametrosJson },
    update: { modelo: parsed.data.modelo, parametros: parametrosJson },
  });

  res.json({ modelo: atualizado.modelo, parametros: atualizado.parametros, catalogo: MODELOS_VIDEO });
});
