import { prisma } from "../db";
import {
  criarContainerImagem,
  criarContainerImagemCarrossel,
  criarContainerCarrossel,
  consultarStatusContainer,
  publicarContainer,
  obterPermalink,
  MetaGraphError,
} from "./metaGraph";
import { comDisclosureAutomatico } from "./disclosure";

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL ?? "http://localhost:4000";

export class PublicacaoInstagramError extends Error {
  tipo: "duplicado" | "sem_conta" | "sem_midia" | "graph" | "timeout";

  constructor(message: string, tipo: PublicacaoInstagramError["tipo"]) {
    super(message);
    this.name = "PublicacaoInstagramError";
    this.tipo = tipo;
  }
}

async function aguardarContainerPronto(containerId: string, accessToken: string): Promise<void> {
  const TENTATIVAS = 5;
  const INTERVALO_MS = 2000;

  for (let tentativa = 0; tentativa < TENTATIVAS; tentativa++) {
    const status = await consultarStatusContainer(containerId, accessToken);
    if (status === "FINISHED") return;
    if (status === "ERROR") throw new PublicacaoInstagramError("O Instagram rejeitou a mídia enviada.", "graph");
    await new Promise((resolve) => setTimeout(resolve, INTERVALO_MS));
  }
  throw new PublicacaoInstagramError("Tempo esgotado aguardando o Instagram processar a mídia.", "timeout");
}

export async function publicarConteudoNoInstagram(conteudoId: string) {
  const conteudo = await prisma.conteudo.findUnique({
    where: { id: conteudoId },
    include: {
      calendario: { include: { empresa: { include: { contasSociais: true } } } },
      publicacoes: true,
    },
  });
  if (!conteudo) throw new PublicacaoInstagramError("Conteúdo não encontrado.", "sem_midia");

  const jaPublicado = conteudo.publicacoes.some((p) => p.rede === "instagram" && p.status === "publicado");
  if (jaPublicado) {
    throw new PublicacaoInstagramError("Este conteúdo já foi publicado no Instagram.", "duplicado");
  }

  const contaInstagram = conteudo.calendario.empresa.contasSociais.find((c) => c.rede === "instagram");
  const credenciais = (contaInstagram?.credenciais as Record<string, string> | null) ?? {};
  if (!contaInstagram || !credenciais.ig_user_id || !credenciais.access_token) {
    throw new PublicacaoInstagramError("Esta empresa não tem uma conta do Instagram conectada.", "sem_conta");
  }

  if (conteudo.midiaUrls.length === 0) {
    throw new PublicacaoInstagramError("Este conteúdo não tem imagem para publicar.", "sem_midia");
  }

  const igUserId = credenciais.ig_user_id;
  const accessToken = credenciais.access_token;
  const ehCarrossel = conteudo.calendario.tipoPost === "carrossel" && conteudo.midiaUrls.length > 1;

  try {
    const legenda = conteudo.texto ? comDisclosureAutomatico(conteudo.texto) : undefined;

    let containerId: string;
    if (ehCarrossel) {
      const childrenIds: string[] = [];
      for (const midiaUrl of conteudo.midiaUrls) {
        const imageUrl = `${PUBLIC_BASE_URL}${midiaUrl}`;
        const childId = await criarContainerImagemCarrossel(igUserId, accessToken, imageUrl);
        await aguardarContainerPronto(childId, accessToken);
        childrenIds.push(childId);
      }
      containerId = await criarContainerCarrossel(igUserId, accessToken, childrenIds, legenda);
    } else {
      const imageUrl = `${PUBLIC_BASE_URL}${conteudo.midiaUrls[0]}`;
      containerId = await criarContainerImagem(igUserId, accessToken, imageUrl, legenda);
    }

    await aguardarContainerPronto(containerId, accessToken);
    const externalPostId = await publicarContainer(igUserId, accessToken, containerId);
    const link = await obterPermalink(externalPostId, accessToken);

    return prisma.publicacao.create({
      data: {
        conteudoId: conteudo.id,
        rede: "instagram",
        externalPostId,
        link,
        status: "publicado",
      },
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido ao publicar no Instagram.";
    await prisma.publicacao.create({
      data: { conteudoId: conteudo.id, rede: "instagram", status: "erro", log: mensagem },
    });
    if (erro instanceof PublicacaoInstagramError) throw erro;
    if (erro instanceof MetaGraphError) throw new PublicacaoInstagramError(mensagem, "graph");
    throw new PublicacaoInstagramError(mensagem, "graph");
  }
}
