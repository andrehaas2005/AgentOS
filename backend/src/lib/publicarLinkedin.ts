import { prisma } from "../db";
import { criarPost } from "./linkedinApi";
import { comDisclosureAutomatico } from "./disclosure";

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

  try {
    const externalPostId = await criarPost(credenciais.access_token, authorUrn, comDisclosureAutomatico(conteudo.texto));
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
