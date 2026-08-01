import { SelectFiltro } from "@/components/SelectFiltro";
import { SelectFiltroEmpresa } from "@/components/SelectFiltroEmpresa";
import { PublicacaoLinha } from "@/components/PublicacaoDetalheModal";
import { getPublicacoes, getEmpresas } from "@/lib/api";

const REDE_OPCOES = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "youtube", label: "YouTube" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "tiktok", label: "TikTok" },
  { value: "blog", label: "Blog" },
  { value: "outro", label: "Outro" },
];

export default async function PublicacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ empresaId?: string; rede?: string }>;
}) {
  const { empresaId, rede } = await searchParams;
  const [publicacoes, empresas] = await Promise.all([
    getPublicacoes(empresaId, rede),
    getEmpresas(),
  ]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-white">Publicações</h1>
        <div className="flex flex-wrap items-center gap-3">
          <SelectFiltroEmpresa empresas={empresas} />
          <SelectFiltro paramName="rede" label="Rede" placeholder="Todas" opcoes={REDE_OPCOES} />
        </div>
      </div>
      {publicacoes.length === 0 ? (
        <p className="text-sm text-gray-500">
          Nenhuma publicação registrada ainda — a publicação real nas redes sociais chega na Fase 2 do
          roadmap.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-panel text-gray-400">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">Data</th>
                <th className="whitespace-nowrap px-4 py-3">Empresa</th>
                <th className="whitespace-nowrap px-4 py-3">Rede</th>
                <th className="whitespace-nowrap px-4 py-3">Status</th>
                <th className="whitespace-nowrap px-4 py-3">ID externo</th>
                <th className="whitespace-nowrap px-4 py-3">Log</th>
              </tr>
            </thead>
            <tbody>
              {publicacoes.map((publicacao) => (
                <PublicacaoLinha key={publicacao.id} publicacao={publicacao} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
