import { Bot } from "lucide-react";
import type { ExecucaoAgente } from "@/lib/api";
import { SPRITE_POR_AGENTE } from "@/lib/agentes";

function tempoRelativo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min atrás`;
  const h = Math.round(min / 60);
  return `${h} h atrás`;
}

export function EventFeed({ eventos }: { eventos: ExecucaoAgente[] }) {
  return (
    <aside className="w-full shrink-0 rounded-xl border border-border bg-panel p-4 lg:w-80">
      <h2 className="mb-3 text-sm font-semibold text-white">Feed de Eventos</h2>
      {eventos.length === 0 && (
        <p className="text-sm text-gray-500">Nenhuma execução de agente registrada ainda.</p>
      )}
      <ul className="flex max-h-[520px] flex-col gap-3 overflow-y-auto pr-1">
        {eventos.map((evento) => (
          <li key={evento.id} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface text-blue-400">
              {SPRITE_POR_AGENTE[evento.agente] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={SPRITE_POR_AGENTE[evento.agente]}
                  alt={evento.agente}
                  className="h-full w-full object-cover"
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                <Bot size={14} />
              )}
            </span>
            <div>
              <p className="text-sm text-gray-200">{evento.agente}</p>
              <p className="text-xs text-gray-500">{tempoRelativo(evento.createdAt)}</p>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
