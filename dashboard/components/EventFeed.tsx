import { Bot } from "lucide-react";
import type { ExecucaoAgente } from "@/lib/api";

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
    <aside className="w-80 shrink-0 rounded-xl border border-border bg-panel p-4">
      <h2 className="mb-3 text-sm font-semibold text-white">Feed de Eventos</h2>
      {eventos.length === 0 && (
        <p className="text-sm text-gray-500">Nenhuma execução de agente registrada ainda.</p>
      )}
      <ul className="flex flex-col gap-3">
        {eventos.map((evento) => (
          <li key={evento.id} className="flex items-start gap-3">
            <span className="mt-0.5 rounded-full bg-surface p-1.5 text-blue-400">
              <Bot size={14} />
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
