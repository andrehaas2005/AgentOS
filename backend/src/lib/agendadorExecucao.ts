import { prisma } from "../db";
import { executarAgenteCeo } from "../agentes/ceo";
import { marcarAtivo, marcarInativo } from "../agentes/status";
import { aprovarConteudo, publicarConteudoAprovado } from "./aprovacao";

const INTERVALO_MS = 60 * 1000;
// Gera o conteúdo com essa antecedência em relação ao horário agendado — dá
// margem pra revisão humana (aprovação manual) antes do horário de publicação.
const ANTECEDENCIA_GERACAO_MS = 5 * 60 * 1000;

// Etapa 1: gera o conteúdo com antecedência. Se o agendamento for de aprovação
// automática, já aprova aqui — mas isso NÃO publica nada, só libera o item pra
// entrar na fila da etapa 2 quando o horário chegar.
async function gerarConteudoAntecipado() {
  const limite = new Date(Date.now() + ANTECEDENCIA_GERACAO_MS);
  const itens = await prisma.calendarioItem.findMany({
    where: { status: "planejado", dataHora: { lte: limite } },
    select: { id: true, aprovacaoAutomatica: true },
  });

  for (const item of itens) {
    // Reivindica o item atomicamente antes de rodar — evita que duas checagens
    // sobrepostas (ex: uma execução demorada segurando o tick seguinte) disparem
    // o mesmo item duas vezes.
    const reivindicado = await prisma.calendarioItem.updateMany({
      where: { id: item.id, status: "planejado" },
      data: { status: "em_producao" },
    });
    if (reivindicado.count === 0) continue;

    try {
      const resultado = await executarAgenteCeo(item.id);
      console.log(`Execução automática concluída para o item de calendário ${item.id}`);

      if (item.aprovacaoAutomatica) {
        await aprovarConteudo(resultado.conteudo.id, "Automático").catch((erro) =>
          console.error(`Aprovação automática falhou para o conteúdo ${resultado.conteudo.id}:`, erro),
        );
      }
    } catch (erro) {
      console.error(`Execução automática falhou para o item de calendário ${item.id}:`, erro);
    }
  }
}

// Etapa 2: só quando o horário agendado chega de verdade — item precisa já estar
// "aprovado" (manual ou automático, não importa quando isso aconteceu). O CEO
// confere a aprovação e aciona o Publicador; se ainda não tiver sido aprovado, o
// item simplesmente não entra nessa consulta e fica esperando — assim que alguém
// aprovar (mesmo depois do horário), o próximo tick já publica.
async function publicarAprovadosNoHorario() {
  const agora = new Date();
  const itens = await prisma.calendarioItem.findMany({
    where: { status: "aprovado", dataHora: { lte: agora } },
    select: { id: true, empresaId: true, conteudos: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true } } },
  });

  for (const item of itens) {
    const conteudo = item.conteudos[0];
    if (!conteudo) continue;

    const reivindicado = await prisma.calendarioItem.updateMany({
      where: { id: item.id, status: "aprovado" },
      data: { status: "publicando" },
    });
    if (reivindicado.count === 0) continue;

    marcarAtivo("CEO", "Verificando aprovação antes de publicar");
    await prisma.execucaoAgente
      .create({
        data: {
          agente: "CEO",
          empresaId: item.empresaId,
          entrada: { calendarioItemId: item.id },
          saida: { aprovado: true, acao: "Horário chegou e conteúdo está aprovado — acionando o Publicador" },
          status: "sucesso",
        },
      })
      .finally(() => marcarInativo("CEO"));

    try {
      await publicarConteudoAprovado(conteudo.id);
    } catch (erro) {
      console.error(`Publicação agendada falhou para o item de calendário ${item.id}:`, erro);
      await prisma.calendarioItem.update({ where: { id: item.id }, data: { status: "erro" } }).catch(() => {});
    }
  }
}

export function iniciarAgendadorExecucao() {
  async function checar() {
    await gerarConteudoAntecipado().catch((erro) => console.error("Erro ao gerar conteúdo antecipado:", erro));
    await publicarAprovadosNoHorario().catch((erro) => console.error("Erro ao publicar itens aprovados:", erro));
  }
  checar();
  setInterval(checar, INTERVALO_MS);
}
