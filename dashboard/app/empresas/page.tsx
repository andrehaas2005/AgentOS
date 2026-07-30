import { Sidebar } from "@/components/Sidebar";
import { EmpresaCard } from "@/components/EmpresaCard";
import { NovaEmpresaButton } from "@/components/NovaEmpresaButton";
import { getEmpresas } from "@/lib/api";

export default async function EmpresasPage() {
  const empresas = await getEmpresas();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Empresas</h1>
          <NovaEmpresaButton />
        </div>
        {empresas.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma empresa cadastrada ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {empresas.map((empresa) => (
              <EmpresaCard key={empresa.id} empresa={empresa} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
