import { prisma } from "../db";
import { marcarAtivo, marcarInativo } from "../agentes/status";
import { gerarTexto } from "./llmClient";
import { publicarConteudoNoInstagram } from "./publicarInstagram";
import { publicarConteudoNoLinkedin } from "./publicarLinkedin";

export type ResultadoPublicacaoRede = { rede: string; ok: boolean; erro?: string };
export type RedeSuportada = "instagram" | "linkedin";

const PROMPT_ANALISE_CEO = `Você é o CEO de uma agência de marketing digital automatizada. O Publicador (agente responsável
por publicar posts nas redes sociais) reportou uma falha ao tentar publicar um conteúdo. Analise o erro técnico
recebido e responda em português, em no máximo 2 frases curtas e diretas: (1) o motivo provável da falha e
(2) a ação recomendada (ex: revisar credenciais/token da conta, tentar publicar novamente, ajustar a mídia ou
o conteúdo, ou acionar André Haas para revisão manual). Não invente detalhes que não estão no erro.`;

// Aprovação é só o registro de quem/quando aprovou — nunca publica. Usado tanto pelo
// botão manual (banner "aguardando aprovação" e tela de Conteúdo) quanto pela aprovação
// automática do agendador (que roda logo após a geração do conteúdo, bem antes do
// horário agendado). A publicação em si só acontece quando o horário chega — ver
// publicarConteudoAprovado, disparado pelo agendador.
export async function aprovarConteudo(conteudoId: string, aprovadoPor: string): Promise<void> {
  const conteudo = await prisma.conteudo.findUnique({ where: { id: conteudoId } });
  if (!conteudo) throw new Error("Conteúdo não encontrado.");

  await prisma.conteudo.update({
    where: { id: conteudoId },
    data: { aprovadoPor, aprovadoEm: new Date() },
  });
  await prisma.calendarioItem.update({ where: { id: conteudo.calendarioId }, data: { status: "aprovado" } });
}

// Publica numa única rede através do Publicador (fica ativo no escritório, cada
// tentativa vira um ExecucaoAgente); se falhar, escala pro CEO analisar o motivo e
// recomendar a próxima ação. Usado tanto pela publicação agendada (todas as redes de
// uma vez) quanto pelos botões manuais de publicar por rede na tela de Conteúdo — nos
// dois casos, o chamador já garantiu que o conteúdo está aprovado antes de chamar isso.
export async function executarPublicacaoAgente(
  conteudoId: string,
  empresaId: string,
  rede: RedeSuportada,
): Promise<void> {
  const inicio = Date.now();
  marcarAtivo("Publicador", `Publicando no ${rede}`);
  try {
    if (rede === "instagram") await publicarConteudoNoInstagram(conteudoId);
    else await publicarConteudoNoLinkedin(conteudoId);

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
    throw erro;
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

// Recalcula o status do CalendarioItem a partir do estado real das publicações —
// chamado depois de qualquer tentativa de publicação (manual, rede por rede, ou
// agendada). "publicado" só quando TODA rede conectada já tem uma Publicacao com
// sucesso; "erro" se alguma tentativa falhou; senão fica "aprovado" (ainda faltam
// redes pra publicar).
export async function atualizarStatusAposPublicacao(calendarioId: string): Promise<void> {
  const calendario = await prisma.calendarioItem.findUnique({
    where: { id: calendarioId },
    include: {
      empresa: { include: { contasSociais: true } },
      conteudos: { orderBy: { createdAt: "desc" }, take: 1, include: { publicacoes: true } },
    },
  });
  const conteudo = calendario?.conteudos[0];
  if (!calendario || !conteudo) return;

  const redesConectadas = calendario.empresa.contasSociais
    .filter((c) => c.status === "conectado" && (c.rede === "instagram" || c.rede === "linkedin"))
    .map((c) => c.rede);
  if (redesConectadas.length === 0) return;

  const temErro = conteudo.publicacoes.some((p) => p.status === "erro");
  const todasPublicadas = redesConectadas.every((rede) =>
    conteudo.publicacoes.some((p) => p.rede === rede && p.status === "publicado"),
  );
  const status = todasPublicadas ? "publicado" : temErro ? "erro" : "aprovado";
  await prisma.calendarioItem.update({ where: { id: calendarioId }, data: { status } });
}

// Disparado só pelo agendador, quando o horário agendado chega e o item já está
// "aprovado" — publica em toda rede conectada de uma vez e define o status final.
export async function publicarConteudoAprovado(conteudoId: string): Promise<ResultadoPublicacaoRede[]> {
  const conteudo = await prisma.conteudo.findUnique({
    where: { id: conteudoId },
    include: { calendario: { include: { empresa: { include: { contasSociais: true } } } } },
  });
  if (!conteudo) throw new Error("Conteúdo não encontrado.");
  if (!conteudo.aprovadoPor) throw new Error("Este conteúdo ainda não foi aprovado.");

  const empresaId = conteudo.calendario.empresaId;
  const redesConectadas = conteudo.calendario.empresa.contasSociais
    .filter((c) => c.status === "conectado" && (c.rede === "instagram" || c.rede === "linkedin"))
    .map((c) => c.rede as RedeSuportada);

  const resultados: ResultadoPublicacaoRede[] = [];
  for (const rede of redesConectadas) {
    try {
      await executarPublicacaoAgente(conteudoId, empresaId, rede);
      resultados.push({ rede, ok: true });
    } catch (erro) {
      resultados.push({ rede, ok: false, erro: erro instanceof Error ? erro.message : String(erro) });
    }
  }

  const status = resultados.length > 0 && resultados.every((r) => r.ok) ? "publicado" : "erro";
  await prisma.calendarioItem.update({ where: { id: conteudo.calendarioId }, data: { status } });

  return resultados;
}
