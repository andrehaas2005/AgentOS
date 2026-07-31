import { prisma } from "../db";
import { criarContainerImagem, consultarStatusContainer, publicarContainer, MetaGraphError } from "./metaGraph";

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

  const imageUrl = `${PUBLIC_BASE_URL}${conteudo.midiaUrls[0]}`;
  const igUserId = credenciais.ig_user_id;
  const accessToken = credenciais.access_token;

  try {
    const containerId = await criarContainerImagem(igUserId, accessToken, imageUrl, conteudo.texto ?? undefined);
    await aguardarContainerPronto(containerId, accessToken);
    const externalPostId = await publicarContainer(igUserId, accessToken, containerId);

    return prisma.publicacao.create({
      data: {
        conteudoId: conteudo.id,
        rede: "instagram",
        externalPostId,
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
