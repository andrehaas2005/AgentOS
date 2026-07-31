"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EmpresaAvatar } from "./EmpresaAvatar";
import { EditarPostagemModal } from "./EditarPostagemModal";
import { excluirCalendarioItem, type CalendarioItem } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  planejado: "Planejado",
  em_producao: "Em produção",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovado: "Aprovado",
  publicando: "Publicando",
  publicado: "Publicado",
  erro: "Erro",
};

const STATUS_ESTILO: Record<string, { badge: string; borda: string }> = {
  planejado: { badge: "bg-gray-500/15 text-gray-300", borda: "border-l-gray-500" },
  em_producao: { badge: "bg-blue-500/15 text-blue-300", borda: "border-l-blue-500" },
  aguardando_aprovacao: { badge: "bg-amber-500/15 text-amber-300", borda: "border-l-amber-500" },
  aprovado: { badge: "bg-cyan-500/15 text-cyan-300", borda: "border-l-cyan-500" },
  publicando: { badge: "bg-purple-500/15 text-purple-300", borda: "border-l-purple-500" },
  publicado: { badge: "bg-green-500/15 text-green-300", borda: "border-l-green-500" },
  erro: { badge: "bg-red-500/15 text-red-300", borda: "border-l-red-500" },
};

const TIPO_LABEL: Record<string, string> = {
  imagem_frase: "Imagem com frase",
  carrossel: "Carrossel",
  animacao: "Animação",
  video_curto: "Vídeo curto",
  stories: "Stories",
  reels: "Reels",
  post: "Post (texto)",
};

function formatarDataHoraBR(iso: string): string {
  const data = new Date(iso);
  const dia = data.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const hora = data.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
  const semana = data.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short" });
  return `${semana} ${dia} ${hora}`;
}

export function CalendarioTable({
  itens,
  highlightId,
}: {
  itens: CalendarioItem[];
  highlightId?: string;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<CalendarioItem | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  useEffect(() => {
    if (!highlightId) return;
    const item = itens.find((i) => i.id === highlightId);
    if (item) setEditando(item);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId]);

  async function excluir(item: CalendarioItem) {
    if (!window.confirm("Excluir esta postagem agendada? Essa ação não pode ser desfeita.")) return;
    setExcluindoId(item.id);
    const resultado = await excluirCalendarioItem(item.id);
    setExcluindoId(null);
    if (!resultado.ok) {
      window.alert(resultado.erro ?? "Não foi possível excluir.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-panel text-gray-400">
          <tr>
            <th className="px-4 py-3">Data/Hora (Brasília)</th>
            <th className="px-4 py-3">Empresa</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Assunto</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => {
            const conteudo = item.conteudos?.[0];
            const publicacaoErro = conteudo?.publicacoes.find((p) => p.status === "erro");
            const publicacaoOk = conteudo?.publicacoes.find((p) => p.status === "publicado");
            // Publicado é o estado mais definitivo — se já saiu de verdade, ele manda na
            // exibição, independente do status (bruto) que o CalendarioItem ainda carrega.
            const statusEfetivo = publicacaoOk ? "publicado" : item.status;
            const estilo = STATUS_ESTILO[statusEfetivo] ?? STATUS_ESTILO.planejado;
            const assunto = item.briefing?.trim() || conteudo?.texto?.slice(0, 80) || "—";
            const podeExcluir =
              !publicacaoOk &&
              item.status !== "aprovado" &&
              item.status !== "publicando" &&
              item.status !== "publicado";

            return (
              <tr
                key={item.id}
                className={`border-t border-border border-l-4 bg-surface ${estilo.borda}`}
              >
                <td className="whitespace-nowrap px-4 py-3">{formatarDataHoraBR(item.dataHora)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <EmpresaAvatar nome={item.empresa.nome} logoUrl={item.empresa.logoUrl} size={20} />
                    {item.empresa.nome}
                  </div>
                </td>
                <td className="px-4 py-3">{TIPO_LABEL[item.tipoPost] ?? item.tipoPost}</td>
                <td className="max-w-xs truncate px-4 py-3 text-gray-300" title={assunto}>
                  {assunto}
                  {conteudo?.metadata?.hashtags?.length ? (
                    <span className="ml-1 text-xs text-gray-500">
                      · {conteudo.metadata.hashtags.length} hashtags
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${estilo.badge}`}>
                    {STATUS_LABEL[statusEfetivo] ?? statusEfetivo}
                  </span>
                  {!publicacaoOk && publicacaoErro && (
                    <div className="mt-1 max-w-[16rem] truncate text-xs text-red-400" title={publicacaoErro.log ?? ""}>
                      {publicacaoErro.log ?? "Falha ao publicar"}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => setEditando(item)}
                    className="rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-panel hover:text-white"
                  >
                    Editar
                  </button>
                  {podeExcluir && (
                    <button
                      type="button"
                      onClick={() => excluir(item)}
                      disabled={excluindoId === item.id}
                      className="rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-panel hover:text-red-400 disabled:opacity-50"
                    >
                      {excluindoId === item.id ? "Excluindo..." : "Excluir"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {editando && (
        <EditarPostagemModal item={editando} onClose={() => setEditando(null)} />
      )}
    </div>
  );
}
