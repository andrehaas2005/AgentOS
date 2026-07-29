import type { Empresa } from "@/lib/api";

export function EmpresaCard({ empresa }: { empresa: Empresa }) {
  const conectadas = empresa.contasSociais.filter((c) => c.status === "conectado").length;
  const total = empresa.contasSociais.length || 1;
  const progresso = Math.round((conectadas / total) * 100);

  return (
    <div className="min-w-[220px] flex-1 rounded-xl border border-border bg-panel p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-white">{empresa.nome}</h3>
        <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-gray-300">
          {empresa.nicho ?? "sem nicho"}
        </span>
      </div>
      <p className="mt-3 text-xs text-gray-400">Contas conectadas</p>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface">
        <div className="h-full rounded-full bg-blue-500" style={{ width: `${progresso}%` }} />
      </div>
      <p className="mt-1 text-xs text-gray-500">{conectadas} de {empresa.contasSociais.length} redes</p>
    </div>
  );
}
