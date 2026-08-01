import { prisma } from "../db";
import { marcarAtivo, marcarInativo } from "../agentes/status";
import { gerarJsonChat, type MensagemChat } from "./llmClient";
import { obterSkills } from "./skillsAgentes";

export type { MensagemChat };

export type TurnoChat<TMudancas> =
  | { tipo: "pergunta"; pergunta: string }
  | { tipo: "aplicar"; resumo: string; mudancas: TMudancas };

// Infra genérica pra "conversar com um agente até ele decidir perguntar mais ou aplicar uma
// mudança" — não sabe nada sobre o que está sendo editado (slide, legenda, etc.). Cada feature
// específica (ex.: recriarSlide.ts) chama isso passando sua própria skill/contexto/schema de
// mudanças, e decide o que fazer com o resultado quando tipo === "aplicar". Reaproveitável por
// qualquer chat futuro com outro agente.
export async function dispararTurnoChat<TMudancas>(opcoes: {
  skillChave: string;
  agenteExibicao: string;
  empresaId: string;
  contextoSistema: string;
  mensagens: MensagemChat[];
  schemaMudancas: Record<string, unknown>;
}): Promise<TurnoChat<TMudancas>> {
  const { skillChave, agenteExibicao, empresaId, contextoSistema, mensagens, schemaMudancas } = opcoes;

  const skills = await obterSkills();
  const skill = skills[skillChave];
  if (!skill) throw new Error(`Skill "${skillChave}" não encontrada.`);

  const systemPrompt = `${skill.prompt}\n\n${contextoSistema}`;
  const inicio = Date.now();
  marcarAtivo(agenteExibicao, "Conversando sobre uma mudança");
  try {
    const resultado = await gerarJsonChat<{
      tipo: string;
      pergunta?: string;
      resumo?: string;
      mudancas?: TMudancas;
    }>(
      systemPrompt,
      mensagens,
      {
        type: "OBJECT",
        properties: {
          tipo: { type: "STRING" },
          pergunta: { type: "STRING" },
          resumo: { type: "STRING" },
          mudancas: schemaMudancas,
        },
        required: ["tipo"],
      },
      { empresaId },
    );

    if (resultado.tipo === "aplicar") {
      const turno: TurnoChat<TMudancas> = {
        tipo: "aplicar",
        resumo: resultado.resumo ?? "Mudanças aplicadas.",
        mudancas: (resultado.mudancas ?? {}) as TMudancas,
      };
      // Só o turno final ("aplicar") vira um registro no Feed de Eventos — perguntas
      // intermediárias fariam ruído demais na timeline do agente.
      await prisma.execucaoAgente.create({
        data: {
          agente: agenteExibicao,
          empresaId,
          entrada: { mensagens },
          saida: { resumo: turno.resumo, mudancas: turno.mudancas as object },
          duracaoMs: Date.now() - inicio,
          status: "sucesso",
        },
      });
      return turno;
    }

    return {
      tipo: "pergunta",
      pergunta: resultado.pergunta ?? "Pode dar mais detalhes sobre o que você quer mudar?",
    };
  } catch (erro) {
    await prisma.execucaoAgente.create({
      data: {
        agente: agenteExibicao,
        empresaId,
        entrada: { mensagens },
        saida: { erro: erro instanceof Error ? erro.message : String(erro) },
        duracaoMs: Date.now() - inicio,
        status: "erro",
      },
    });
    throw erro;
  } finally {
    marcarInativo(agenteExibicao);
  }
}
