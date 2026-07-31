import { Image as ImageIcon, GalleryHorizontal, Sparkles, Video, Clapperboard, Film, FileText } from "lucide-react";
import type { Conteudo } from "@/lib/api";
import { EmpresaAvatar } from "./EmpresaAvatar";
import { PublicarInstagramPanel } from "./PublicarInstagramPanel";
import { PublicarLinkedinPanel } from "./PublicarLinkedinPanel";
import { TextoConteudo } from "./TextoConteudo";

const STATUS_LABEL: Record<string, string> = {
  planejado: "Planejado",
  em_producao: "Em produção",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovado: "Aprovado",
  publicado: "Publicado",
  erro: "Erro",
};

const TIPO_ICON: Record<string, typeof ImageIcon> = {
  imagem_frase: ImageIcon,
  carrossel: GalleryHorizontal,
  animacao: Sparkles,
  video_curto: Video,
  stories: Clapperboard,
  reels: Film,
  post: FileText,
};

export function ConteudoPreviewCard({ conteudo }: { conteudo: Conteudo }) {
  const Icone = TIPO_ICON[conteudo.calendario.tipoPost] ?? FileText;
  const promptVisual = conteudo.metadata?.promptImagem ?? conteudo.metadata?.roteiroVideo;
  // Prompt visual é só uma descrição de mídia que ainda falta gerar/subir — assim que existe
  // mídia de verdade (upload manual, já que não há provedor de geração de imagem/vídeo), o
  // card deve mostrar os painéis de publicar em vez da prévia do prompt pra sempre.
  const mostrarPromptVisual = promptVisual && conteudo.midiaUrls.length === 0;

  return (
    <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-xl border border-border bg-panel">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <EmpresaAvatar
            nome={conteudo.calendario.empresa.nome}
            logoUrl={conteudo.calendario.empresa.logoUrl}
            size={28}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{conteudo.calendario.empresa.nome}</p>
            <p className="text-[11px] text-gray-500">
              {new Date(conteudo.calendario.dataHora).toLocaleString("pt-BR")}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-300">
          {conteudo.calendario.tipoPost}
        </span>
      </div>

      {mostrarPromptVisual ? (
        <div className="flex aspect-square flex-col items-center justify-center gap-2 bg-gradient-to-br from-surface to-black/40 px-4 text-center">
          <Icone size={32} className="text-gray-500" />
          <p className="line-clamp-4 text-[11px] italic text-gray-400">
            Prévia do prompt visual: &quot;{promptVisual}&quot;
          </p>
        </div>
      ) : (
        <>
          <PublicarInstagramPanel conteudo={conteudo} />
          <PublicarLinkedinPanel conteudo={conteudo} />
        </>
      )}

      <div className="flex flex-col gap-2 p-3">
        <TextoConteudo id={conteudo.id} texto={conteudo.texto} />

        {conteudo.metadata?.hashtags && conteudo.metadata.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {conteudo.metadata.hashtags.map((tag) => (
              <span key={tag} className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-300">
                {tag}
              </span>
            ))}
          </div>
        )}

        {conteudo.metadata?.cta && (
          <p className="text-xs text-gray-400">
            <span className="font-medium text-gray-300">CTA:</span> {conteudo.metadata.cta}
          </p>
        )}

        <div className="mt-1 flex items-center justify-between border-t border-border pt-2 text-[11px] text-gray-500">
          <span>v{conteudo.versao}</span>
          <span>{STATUS_LABEL[conteudo.calendario.status] ?? conteudo.calendario.status}</span>
        </div>
      </div>
    </div>
  );
}
