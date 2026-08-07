import { prisma } from "../db";
import {
  criarContainerImagem,
  criarContainerImagemCarrossel,
  criarContainerCarrossel,
  criarContainerVideo,
  consultarStatusContainer,
  publicarContainer,
  obterPermalink,
  MetaGraphError,
} from "./metaGraph";
import { comDisclosureAutomatico } from "./disclosure";
import { ehVideo } from "./midiaConteudo";

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL ?? "http://localhost:4000";

export class PublicacaoInstagramError extends Error {
  tipo: "duplicado" | "sem_conta" | "sem_midia" | "graph" | "timeout";

  constructor(message: string, tipo: PublicacaoInstagramError["tipo"]) {
    super(message);
    this.name = "PublicacaoInstagramError";
    this.tipo = tipo;
  }
}

// Vídeo demora bem mais que imagem pro Instagram processar (transcodificação) — passa
// fácil de 1 minuto pra vídeos curtos. Imagem processa quase na hora, mantém o timeout
// curto original.
async function aguardarContainerPronto(
  containerId: string,
  accessToken: string,
  opcoes?: { tentativas?: number; intervaloMs?: number },
): Promise<void> {
  const TENTATIVAS = opcoes?.tentativas ?? 5;
  const INTERVALO_MS = opcoes?.intervaloMs ?? 2000;

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
  const ehVideoUnico = conteudo.midiaUrls.length === 1 && ehVideo(conteudo.midiaUrls[0]);
  const ehCarrossel = !ehVideoUnico && conteudo.calendario.tipoPost === "carrossel" && conteudo.midiaUrls.length > 1;

  // Vídeo demora bem mais que imagem pra transcodificar — dá até 3 minutos (60 tentativas
  // de 3s) antes de desistir, em vez dos ~10s usados pra imagem/carrossel.
  const TENTATIVAS_VIDEO = { tentativas: 60, intervaloMs: 3000 };

  try {
    const legenda = conteudo.texto ? comDisclosureAutomatico(conteudo.texto) : undefined;

    let containerId: string;
    if (ehVideoUnico) {
      const videoUrl = `${PUBLIC_BASE_URL}${conteudo.midiaUrls[0]}`;
      containerId = await criarContainerVideo(igUserId, accessToken, videoUrl, legenda);
    } else if (ehCarrossel) {
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

    await aguardarContainerPronto(containerId, accessToken, ehVideoUnico ? TENTATIVAS_VIDEO : undefined);
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
