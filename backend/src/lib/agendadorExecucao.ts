import { prisma } from "../db";
import { executarAgenteCeo } from "../agentes/ceo";
import { aprovarEPublicarConteudo } from "./aprovacao";

const INTERVALO_MS = 60 * 1000;
// Gera o conteúdo com essa antecedência em relação ao horário agendado — dá
// margem pra revisão humana (aprovação manual) antes do horário de publicação.
const ANTECEDENCIA_GERACAO_MS = 5 * 60 * 1000;

async function verificarEDispachar() {
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
        await aprovarEPublicarConteudo(resultado.conteudo.id, "Automático").catch((erro) =>
          console.error(`Aprovação automática falhou para o conteúdo ${resultado.conteudo.id}:`, erro),
        );
      }
    } catch (erro) {
      console.error(`Execução automática falhou para o item de calendário ${item.id}:`, erro);
    }
  }
}

export function iniciarAgendadorExecucao() {
  verificarEDispachar().catch((erro) => console.error("Erro na checagem inicial do agendador:", erro));
  setInterval(() => {
    verificarEDispachar().catch((erro) => console.error("Erro na checagem periódica do agendador:", erro));
  }, INTERVALO_MS);
}
