import { useState } from "react";
import { Image as ImageIcon, GalleryHorizontal, Sparkles, Video, Clapperboard, Film, FileText, Copy } from "lucide-react";
import { type Conteudo, type Empresa } from "@/lib/api";
import { EmpresaAvatar } from "./EmpresaAvatar";
import { CarrosselMidia } from "./CarrosselMidia";
import { EnviarMidiaControle } from "./EnviarMidiaControle";
import { AprovarBotao } from "./AprovarBotao";
import { RevisaoBotao } from "./RevisaoBotao";
import { PublicarInstagramPanel } from "./PublicarInstagramPanel";
import { PublicarLinkedinPanel } from "./PublicarLinkedinPanel";
import { TextoConteudo } from "./TextoConteudo";
import { TipoPostSelector } from "./TipoPostSelector";
import { ReplicarConteudoModal } from "./ReplicarConteudoModal";

const STATUS_LABEL: Record<string, string> = {
  planejado: "Planejado",
  em_producao: "Em produção",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovado: "Aprovado",
  publicando: "Publicando",
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

export function ConteudoPreviewCard({ conteudo, empresas }: { conteudo: Conteudo; empresas: Empresa[] }) {
  const [replicando, setReplicando] = useState(false);
  const Icone = TIPO_ICON[conteudo.calendario.tipoPost] ?? FileText;
  const promptVisual =
    conteudo.metadata?.promptImagem ?? conteudo.metadata?.promptImagens?.[0] ?? conteudo.metadata?.roteiroVideo;
  const temMidia = conteudo.midiaUrls.length > 0;
  // Prompt visual é só uma descrição de mídia que ainda falta gerar/subir — assim que existe
  // mídia de verdade, o card deve mostrar a imagem em vez da prévia do prompt pra sempre.
  const mostrarPromptVisual = promptVisual && !temMidia;

  const contasSociais = conteudo.calendario.empresa.contasSociais;
  const redesAlvo = conteudo.calendario.redesAlvo;
  const alvoInclui = (rede: string) => redesAlvo.length === 0 || redesAlvo.includes(rede);
  const temInstagram = alvoInclui("instagram") && contasSociais.some((c) => c.rede === "instagram" && c.status === "conectado");
  const temLinkedin = alvoInclui("linkedin") && contasSociais.some((c) => c.rede === "linkedin" && c.status === "conectado");
  const precisaAprovar = !conteudo.aprovadoPor;

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
              {new Date(conteudo.calendario.dataHora).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
            </p>
          </div>
        </div>
        <TipoPostSelector conteudoId={conteudo.id} tipoPost={conteudo.calendario.tipoPost} />
      </div>

      {mostrarPromptVisual ? (
        <div className="flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-surface to-black/40 px-4 py-6 text-center">
          <Icone size={32} className="text-gray-500" />
          <p className="line-clamp-4 text-[11px] italic text-gray-400">
            Prévia do prompt visual: &quot;{promptVisual}&quot;
          </p>
          <EnviarMidiaControle conteudoId={conteudo.id} />
        </div>
      ) : temMidia ? (
        <div className="flex flex-col gap-2 border-b border-border pb-2">
          <CarrosselMidia conteudoId={conteudo.id} urls={conteudo.midiaUrls} metadata={conteudo.metadata} />
          <div className="flex justify-center px-3">
            <EnviarMidiaControle conteudoId={conteudo.id} />
          </div>
        </div>
      ) : (
        <div className="flex aspect-square flex-col items-center justify-center gap-2 bg-gradient-to-br from-surface to-black/40 px-4 text-center">
          <Icone size={32} className="text-gray-500" />
          <EnviarMidiaControle conteudoId={conteudo.id} />
        </div>
      )}

      {(precisaAprovar || temInstagram || temLinkedin) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2">
          {precisaAprovar && (
            <>
              <RevisaoBotao conteudo={conteudo} />
              <AprovarBotao conteudo={conteudo} />
            </>
          )}
          {temInstagram && <PublicarInstagramPanel conteudo={conteudo} />}
          {temLinkedin && <PublicarLinkedinPanel conteudo={conteudo} />}
        </div>
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

        {conteudo.metadata?.notasAgentesCustomizados && conteudo.metadata.notasAgentesCustomizados.length > 0 && (
          <div className="flex flex-col gap-1.5 rounded-lg bg-surface p-2">
            {conteudo.metadata.notasAgentesCustomizados.map((n, i) => (
              <p key={i} className="text-[11px] text-gray-400">
                <span className="font-medium text-gray-300">{n.agente}:</span> {n.nota}
              </p>
            ))}
          </div>
        )}

        <div className="mt-1 flex items-center justify-between border-t border-border pt-2 text-[11px] text-gray-500">
          <div className="flex items-center gap-2">
            <span>v{conteudo.versao}</span>
            <button
              type="button"
              onClick={() => setReplicando(true)}
              disabled={empresas.length === 0}
              title="Replicar para outra empresa"
              className="rounded p-0.5 hover:bg-surface hover:text-white disabled:opacity-50"
            >
              <Copy size={12} />
            </button>
          </div>
          <span>{STATUS_LABEL[conteudo.calendario.status] ?? conteudo.calendario.status}</span>
        </div>
      </div>

      {replicando && (
        <ReplicarConteudoModal conteudo={conteudo} empresas={empresas} onClose={() => setReplicando(false)} />
      )}
    </div>
  );
}
