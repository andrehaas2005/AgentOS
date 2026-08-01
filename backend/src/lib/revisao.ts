import { prisma } from "../db";
import { marcarAtivo, marcarInativo } from "../agentes/status";
import { gerarJson } from "./llmClient";
import { obterSkills } from "./skillsAgentes";

export type ResultadoRevisao = {
  versaoRevisada: number;
  aprovado: boolean;
  observacoes: string;
  revisadoEm: string;
};

type MetadataConteudo = {
  hashtags?: string[];
  cta?: string;
  promptImagem?: string;
  promptImagens?: string[];
  roteiroVideo?: string;
};

// Roda o Revisor de Marca de novo, mas contra o conteúdo COMO ESTÁ AGORA (depois de
// edições manuais do usuário) — diferente da revisão que já roda dentro do pipeline do CEO
// na geração original. Só grava aprovado/observações: não é uma reescrita automática, é uma
// checagem informativa que o humano usa pra decidir se aprova.
export async function dispararRevisao(conteudoId: string): Promise<ResultadoRevisao> {
  const conteudo = await prisma.conteudo.findUnique({
    where: { id: conteudoId },
    include: { calendario: { include: { empresa: true } } },
  });
  if (!conteudo) throw new Error("Conteúdo não encontrado.");

  const empresa = conteudo.calendario.empresa;
  const metadata = (conteudo.metadata as MetadataConteudo | null) ?? {};
  const skills = await obterSkills();

  const contexto = `Empresa: ${empresa.nome}
Nicho: ${empresa.nicho ?? "não informado"}
Tom de voz: ${empresa.tomDeVoz ?? "não informado"}
Guidelines de marca: ${empresa.brandGuidelines ? JSON.stringify(empresa.brandGuidelines) : "nenhuma definida"}

Tipo de post: ${conteudo.calendario.tipoPost}`;

  const prompt = `${contexto}

Conteúdo atual (já editado manualmente, pode ter sido alterado desde a geração original):
Legenda: ${conteudo.texto ?? ""}
Hashtags: ${(metadata.hashtags ?? []).join(" ")}
CTA: ${metadata.cta ?? ""}
${metadata.promptImagem ? `Prompt de imagem: ${metadata.promptImagem}\n` : ""}${
    metadata.promptImagens
      ? `Prompts das imagens do carrossel:\n${metadata.promptImagens.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n`
      : ""
  }${metadata.roteiroVideo ? `Roteiro de vídeo: ${metadata.roteiroVideo}\n` : ""}Mídia atual: ${conteudo.midiaUrls.length} arquivo(s).

Valide se está alinhado às guidelines da marca.`;

  const inicio = Date.now();
  marcarAtivo("Revisor de Marca", "Revisando edição manual do conteúdo");
  try {
    const resultado = await gerarJson<{
      aprovado: boolean;
      observacoes: string;
      legendaFinal: string;
      hashtagsFinal: string[];
      ctaFinal: string;
    }>(
      skills["revisor-marca"].prompt,
      prompt,
      {
        type: "OBJECT",
        properties: {
          aprovado: { type: "BOOLEAN" },
          observacoes: { type: "STRING" },
          legendaFinal: { type: "STRING" },
          hashtagsFinal: { type: "ARRAY", items: { type: "STRING" } },
          ctaFinal: { type: "STRING" },
        },
        required: ["aprovado", "observacoes", "legendaFinal", "hashtagsFinal", "ctaFinal"],
      },
      { empresaId: empresa.id },
    );

    const revisao: ResultadoRevisao = {
      versaoRevisada: conteudo.versao,
      aprovado: resultado.aprovado,
      observacoes: resultado.observacoes,
      revisadoEm: new Date().toISOString(),
    };

    await prisma.conteudo.update({
      where: { id: conteudoId },
      data: { metadata: { ...((conteudo.metadata as Record<string, unknown> | null) ?? {}), ultimaRevisao: revisao } },
    });

    await prisma.execucaoAgente.create({
      data: {
        agente: "Revisor de Marca",
        empresaId: empresa.id,
        entrada: { conteudoId, versao: conteudo.versao },
        saida: { aprovado: resultado.aprovado, observacoes: resultado.observacoes },
        duracaoMs: Date.now() - inicio,
        status: "sucesso",
      },
    });

    return revisao;
  } catch (erro) {
    await prisma.execucaoAgente.create({
      data: {
        agente: "Revisor de Marca",
        empresaId: empresa.id,
        entrada: { conteudoId, versao: conteudo.versao },
        saida: { erro: erro instanceof Error ? erro.message : String(erro) },
        duracaoMs: Date.now() - inicio,
        status: "erro",
      },
    });
    throw erro;
  } finally {
    marcarInativo("Revisor de Marca");
  }
}
