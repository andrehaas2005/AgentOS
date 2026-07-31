import { prisma } from "../db";
import { marcarAtivo, marcarInativo } from "../agentes/status";
import { gerarTexto } from "./geminiClient";
import { publicarConteudoNoInstagram } from "./publicarInstagram";
import { publicarConteudoNoLinkedin } from "./publicarLinkedin";

export type ResultadoPublicacaoRede = { rede: string; ok: boolean; erro?: string };

const PROMPT_ANALISE_CEO = `Você é o CEO de uma agência de marketing digital automatizada. O Publicador (agente responsável
por publicar posts nas redes sociais) reportou uma falha ao tentar publicar um conteúdo. Analise o erro técnico
recebido e responda em português, em no máximo 2 frases curtas e diretas: (1) o motivo provável da falha e
(2) a ação recomendada (ex: revisar credenciais/token da conta, tentar publicar novamente, ajustar a mídia ou
o conteúdo, ou acionar André Haas para revisão manual). Não invente detalhes que não estão no erro.`;

async function publicarNaRedeComoAgente(
  conteudoId: string,
  empresaId: string,
  rede: string,
): Promise<ResultadoPublicacaoRede> {
  const inicio = Date.now();
  marcarAtivo("Publicador", `Publicando no ${rede}`);
  try {
    if (rede === "instagram") await publicarConteudoNoInstagram(conteudoId);
    else if (rede === "linkedin") await publicarConteudoNoLinkedin(conteudoId);

    await prisma.execucaoAgente.create({
      data: {
        agente: "Publicador",
        empresaId,
        entrada: { conteudoId, rede },
        saida: { publicado: true },
        duracaoMs: Date.now() - inicio,
        status: "sucesso",
      },
    });
    return { rede, ok: true };
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    await prisma.execucaoAgente.create({
      data: {
        agente: "Publicador",
        empresaId,
        entrada: { conteudoId, rede },
        saida: { erro: mensagem },
        duracaoMs: Date.now() - inicio,
        status: "erro",
      },
    });
    await escalarFalhaParaCeo(empresaId, rede, mensagem);
    return { rede, ok: false, erro: mensagem };
  } finally {
    marcarInativo("Publicador");
  }
}

async function escalarFalhaParaCeo(empresaId: string, rede: string, motivoErro: string): Promise<void> {
  const inicio = Date.now();
  marcarAtivo("CEO", `Analisando falha de publicação no ${rede}`);
  try {
    const analise = await gerarTexto(PROMPT_ANALISE_CEO, `Rede: ${rede}\nErro reportado pelo Publicador: ${motivoErro}`);
    await prisma.execucaoAgente.create({
      data: {
        agente: "CEO",
        empresaId,
        entrada: { rede, motivoErro },
        saida: { analise },
        duracaoMs: Date.now() - inicio,
        status: "erro",
      },
    });
  } catch (erroAnalise) {
    // A falha original do Publicador já foi registrada — se a própria análise do CEO falhar
    // (ex: Gemini indisponível), não deixamos isso mascarar ou travar o fluxo de aprovação.
    await prisma.execucaoAgente.create({
      data: {
        agente: "CEO",
        empresaId,
        entrada: { rede, motivoErro },
        saida: { erro: erroAnalise instanceof Error ? erroAnalise.message : String(erroAnalise) },
        duracaoMs: Date.now() - inicio,
        status: "erro",
      },
    });
  } finally {
    marcarInativo("CEO");
  }
}

// Chamado tanto pela aprovação automática (agendador) quanto pela aprovação manual
// (botão no painel) — publica em toda rede conectada que o pipeline sabe publicar
// hoje (Instagram e LinkedIn), registrando o resultado de cada uma sem que a falha
// de uma trave a outra. Cada publicação passa pelo agente Publicador (fica ativo no
// escritório, e cada tentativa vira um ExecucaoAgente); se uma rede falhar, o CEO é
// acionado para analisar o motivo e recomendar a próxima ação.
export async function aprovarEPublicarConteudo(
  conteudoId: string,
  aprovadoPor: string,
): Promise<ResultadoPublicacaoRede[]> {
  const conteudo = await prisma.conteudo.findUnique({
    where: { id: conteudoId },
    include: { calendario: { include: { empresa: { include: { contasSociais: true } } } } },
  });
  if (!conteudo) throw new Error("Conteúdo não encontrado.");

  await prisma.conteudo.update({
    where: { id: conteudoId },
    data: { aprovadoPor, aprovadoEm: new Date() },
  });

  const empresaId = conteudo.calendario.empresaId;
  const redesConectadas = conteudo.calendario.empresa.contasSociais
    .filter((c) => c.status === "conectado" && (c.rede === "instagram" || c.rede === "linkedin"))
    .map((c) => c.rede);

  const resultados: ResultadoPublicacaoRede[] = [];
  for (const rede of redesConectadas) {
    resultados.push(await publicarNaRedeComoAgente(conteudoId, empresaId, rede));
  }

  const status = resultados.length > 0 && resultados.every((r) => r.ok) ? "publicado" : "erro";
  await prisma.calendarioItem.update({ where: { id: conteudo.calendarioId }, data: { status } });

  return resultados;
}
