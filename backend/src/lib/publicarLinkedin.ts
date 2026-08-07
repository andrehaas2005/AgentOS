import { prisma } from "../db";
import {
  criarPost,
  inicializarUploadImagem,
  enviarImagemLinkedin,
  inicializarUploadVideo,
  enviarChunkVideoLinkedin,
  finalizarUploadVideo,
  consultarStatusVideoLinkedin,
} from "./linkedinApi";
import { comDisclosureAutomatico } from "./disclosure";
import { ehVideo } from "./midiaConteudo";

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL ?? "http://localhost:4000";

export class PublicacaoLinkedinError extends Error {
  tipo: "duplicado" | "sem_conta" | "sem_texto" | "api";

  constructor(message: string, tipo: PublicacaoLinkedinError["tipo"]) {
    super(message);
    this.name = "PublicacaoLinkedinError";
    this.tipo = tipo;
  }
}

export async function publicarConteudoNoLinkedin(conteudoId: string) {
  const conteudo = await prisma.conteudo.findUnique({
    where: { id: conteudoId },
    include: {
      calendario: { include: { empresa: { include: { contasSociais: true } } } },
      publicacoes: true,
    },
  });
  if (!conteudo) throw new PublicacaoLinkedinError("Conteúdo não encontrado.", "sem_texto");

  const jaPublicado = conteudo.publicacoes.some((p) => p.rede === "linkedin" && p.status === "publicado");
  if (jaPublicado) {
    throw new PublicacaoLinkedinError("Este conteúdo já foi publicado no LinkedIn.", "duplicado");
  }

  const contaLinkedin = conteudo.calendario.empresa.contasSociais.find((c) => c.rede === "linkedin");
  const credenciais = (contaLinkedin?.credenciais as Record<string, string> | null) ?? {};
  if (!contaLinkedin || !credenciais.linkedin_sub || !credenciais.access_token) {
    throw new PublicacaoLinkedinError("Esta empresa não tem uma conta do LinkedIn conectada.", "sem_conta");
  }

  if (!conteudo.texto || !conteudo.texto.trim()) {
    throw new PublicacaoLinkedinError("Este conteúdo não tem texto para publicar.", "sem_texto");
  }

  const authorUrn = `urn:li:person:${credenciais.linkedin_sub}`;
  const ehVideoUnico = conteudo.midiaUrls.length === 1 && ehVideo(conteudo.midiaUrls[0]);

  try {
    // Mídia é opcional — se o conteúdo tiver mídia, sobe pro LinkedIn antes do post (posts
    // com mídia chamam mais atenção que texto solto; carrossel de imagens vira multiImage);
    // sem mídia, publica só o texto. Vídeo é sempre único (video_curto só tem 1 arquivo) e
    // segue um fluxo bem diferente de imagem (Video API, não Images API).
    const mediaUrns: string[] = [];
    if (ehVideoUnico) {
      mediaUrns.push(await uploadarVideoLinkedin(credenciais.access_token, authorUrn, `${PUBLIC_BASE_URL}${conteudo.midiaUrls[0]}`));
    } else {
      for (const midiaUrl of conteudo.midiaUrls) {
        const imagemUrl = `${PUBLIC_BASE_URL}${midiaUrl}`;
        const respostaImagem = await fetch(imagemUrl);
        if (!respostaImagem.ok) {
          throw new PublicacaoLinkedinError(`Não foi possível baixar a imagem do conteúdo (${respostaImagem.status}).`, "api");
        }
        const bufferImagem = Buffer.from(await respostaImagem.arrayBuffer());
        const { uploadUrl, imagemUrn } = await inicializarUploadImagem(credenciais.access_token, authorUrn);
        await enviarImagemLinkedin(credenciais.access_token, uploadUrl, bufferImagem);
        mediaUrns.push(imagemUrn);
      }
    }

    const externalPostId = await criarPost(
      credenciais.access_token,
      authorUrn,
      comDisclosureAutomatico(conteudo.texto),
      mediaUrns.length > 0 ? mediaUrns : undefined,
    );
    const link = `https://www.linkedin.com/feed/update/${externalPostId}/`;

    return prisma.publicacao.create({
      data: {
        conteudoId: conteudo.id,
        rede: "linkedin",
        externalPostId,
        link,
        status: "publicado",
      },
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido ao publicar no LinkedIn.";
    await prisma.publicacao.create({
      data: { conteudoId: conteudo.id, rede: "linkedin", status: "erro", log: mensagem },
    });
    if (erro instanceof PublicacaoLinkedinError) throw erro;
    throw new PublicacaoLinkedinError(mensagem, "api");
  }
}

// Fluxo completo de upload de vídeo pro LinkedIn: baixa o arquivo, inicializa o upload
// (Video API, não Images API), envia cada chunk, finaliza e espera o LinkedIn terminar de
// processar (transcodificar) antes de devolver a URN pronta pra usar em criarPost.
async function uploadarVideoLinkedin(accessToken: string, authorUrn: string, videoUrl: string): Promise<string> {
  const respostaVideo = await fetch(videoUrl);
  if (!respostaVideo.ok) {
    throw new PublicacaoLinkedinError(`Não foi possível baixar o vídeo do conteúdo (${respostaVideo.status}).`, "api");
  }
  const bufferVideo = Buffer.from(await respostaVideo.arrayBuffer());

  const { uploadInstructions, videoUrn, uploadToken } = await inicializarUploadVideo(
    accessToken,
    authorUrn,
    bufferVideo.length,
  );

  const uploadedPartIds: string[] = [];
  for (const instrucao of uploadInstructions) {
    const chunk = bufferVideo.subarray(instrucao.firstByte, instrucao.lastByte + 1);
    uploadedPartIds.push(await enviarChunkVideoLinkedin(instrucao.uploadUrl, chunk));
  }

  await finalizarUploadVideo(accessToken, videoUrn, uploadToken, uploadedPartIds);

  const TENTATIVAS = 40;
  const INTERVALO_MS = 3000;
  for (let tentativa = 0; tentativa < TENTATIVAS; tentativa++) {
    const status = await consultarStatusVideoLinkedin(accessToken, videoUrn);
    if (status === "AVAILABLE") return videoUrn;
    if (status === "PROCESSING_FAILED") {
      throw new PublicacaoLinkedinError("O LinkedIn rejeitou o vídeo enviado.", "api");
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVALO_MS));
  }
  throw new PublicacaoLinkedinError("Tempo esgotado aguardando o LinkedIn processar o vídeo.", "api");
}
