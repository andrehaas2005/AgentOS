import { prisma } from "../db";
import { publicarConteudoNoInstagram } from "./publicarInstagram";
import { publicarConteudoNoLinkedin } from "./publicarLinkedin";

export type ResultadoPublicacaoRede = { rede: string; ok: boolean; erro?: string };

// Chamado tanto pela aprovação automática (agendador) quanto pela aprovação manual
// (botão no painel) — publica em toda rede conectada que o pipeline sabe publicar
// hoje (Instagram e LinkedIn), registrando o resultado de cada uma sem que a falha
// de uma trave a outra.
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

  const redesConectadas = conteudo.calendario.empresa.contasSociais
    .filter((c) => c.status === "conectado" && (c.rede === "instagram" || c.rede === "linkedin"))
    .map((c) => c.rede);

  const resultados: ResultadoPublicacaoRede[] = [];
  for (const rede of redesConectadas) {
    try {
      if (rede === "instagram") await publicarConteudoNoInstagram(conteudoId);
      else if (rede === "linkedin") await publicarConteudoNoLinkedin(conteudoId);
      resultados.push({ rede, ok: true });
    } catch (erro) {
      resultados.push({ rede, ok: false, erro: erro instanceof Error ? erro.message : String(erro) });
    }
  }

  const status = resultados.length > 0 && resultados.every((r) => r.ok) ? "publicado" : "erro";
  await prisma.calendarioItem.update({ where: { id: conteudo.calendarioId }, data: { status } });

  return resultados;
}
