import type { Conteudo, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { dispararTurnoChat, type MensagemChat, type TurnoChat } from "./chatAgente";
import { renderizarCarrosselEducativo, type SlideEducativo } from "./slideRenderer";
import { removerArquivoMidiaDoDisco } from "./midiaConteudo";

export type MudancasSlide = {
  removerImagem?: boolean;
  novoPromptFoto?: string;
  novoTitulo?: string;
  novoTexto?: string;
  novoBadge?: string;
  novaCor?: string;
};

type MetadataConteudo = {
  slidesEducativo?: SlideEducativo[];
  [chave: string]: unknown;
};

const HEX_VALIDO = /^#[0-9a-fA-F]{6}$/;

// Consumidor específico da infra genérica de chat (chatAgente.ts) — só essa função sabe o
// que fazer quando o Diretor de Arte decide "aplicar": mesclar as mudanças no slide, gerar
// uma foto nova se pedido, re-renderizar via slideRenderer e salvar no Conteudo.
export async function dispararTurnoRecriacaoSlide(
  conteudoId: string,
  indice: number,
  mensagens: MensagemChat[],
): Promise<TurnoChat<MudancasSlide> & { conteudo?: Conteudo }> {
  const conteudo = await prisma.conteudo.findUnique({
    where: { id: conteudoId },
    include: { calendario: { include: { empresa: true } } },
  });
  if (!conteudo) throw new Error("Conteúdo não encontrado.");

  const metadata = (conteudo.metadata as MetadataConteudo | null) ?? {};
  const slideAtual = metadata.slidesEducativo?.[indice];
  if (!slideAtual) throw new Error("Esse slide não faz parte de um carrossel educativo.");

  const empresa = conteudo.calendario.empresa;
  const contextoSistema = `Slide atual (índice ${indice}, em JSON): ${JSON.stringify(slideAtual)}
Guidelines de marca da empresa: ${empresa.brandGuidelines ? JSON.stringify(empresa.brandGuidelines) : "nenhuma definida"}`;

  const turno = await dispararTurnoChat<MudancasSlide>({
    skillChave: "diretor-arte-chat",
    agenteExibicao: "Diretor de Arte",
    empresaId: empresa.id,
    contextoSistema,
    mensagens,
    schemaMudancas: {
      type: "OBJECT",
      properties: {
        removerImagem: { type: "BOOLEAN" },
        novoPromptFoto: { type: "STRING" },
        novoTitulo: { type: "STRING" },
        novoTexto: { type: "STRING" },
        novoBadge: { type: "STRING" },
        novaCor: { type: "STRING" },
      },
    },
  });

  if (turno.tipo === "pergunta") return turno;

  const { mudancas } = turno;
  const slideNovo: SlideEducativo = { ...slideAtual };

  if (mudancas.novoTitulo !== undefined) slideNovo.titulo = mudancas.novoTitulo;
  if (mudancas.novaCor !== undefined && HEX_VALIDO.test(mudancas.novaCor)) slideNovo.corOverride = mudancas.novaCor;
  if (slideNovo.tipo === "passo") {
    if (mudancas.novoTexto !== undefined) slideNovo.texto = mudancas.novoTexto;
    if (mudancas.novoBadge !== undefined) slideNovo.badge = mudancas.novoBadge;
  }
  if (slideNovo.tipo === "capa" || slideNovo.tipo === "passo") {
    if (mudancas.removerImagem) slideNovo.promptFoto = undefined;
    else if (mudancas.novoPromptFoto !== undefined) slideNovo.promptFoto = mudancas.novoPromptFoto;
  }

  const urls = await renderizarCarrosselEducativo(conteudoId, empresa, [slideNovo]);
  const novaUrl = urls[0];
  if (!novaUrl) throw new Error("Não foi possível gerar o slide atualizado.");

  const urlAntiga = conteudo.midiaUrls[indice];
  const midiaUrls = [...conteudo.midiaUrls];
  midiaUrls[indice] = novaUrl;

  const slidesEducativo = [...(metadata.slidesEducativo ?? [])];
  slidesEducativo[indice] = slideNovo;

  const conteudoAtualizado = await prisma.conteudo.update({
    where: { id: conteudoId },
    data: {
      midiaUrls: { set: midiaUrls },
      metadata: { ...metadata, slidesEducativo } as unknown as Prisma.InputJsonValue,
      versao: { increment: 1 },
    },
  });
  if (urlAntiga) removerArquivoMidiaDoDisco(urlAntiga);

  return { ...turno, conteudo: conteudoAtualizado };
}
