import { prisma } from "../db";
import { executarAgenteCeo } from "../agentes/ceo";

const INTERVALO_MS = 60 * 1000;

async function verificarEDispachar() {
  const agora = new Date();
  const itens = await prisma.calendarioItem.findMany({
    where: { status: "planejado", dataHora: { lte: agora } },
    select: { id: true },
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
      await executarAgenteCeo(item.id);
      console.log(`Execução automática concluída para o item de calendário ${item.id}`);
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
