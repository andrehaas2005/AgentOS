import { Sidebar } from "@/components/Sidebar";
import { EmpresaCard } from "@/components/EmpresaCard";
import { getEmpresas } from "@/lib/api";

export default async function EmpresasPage() {
  const empresas = await getEmpresas();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6">
        <h1 className="mb-6 text-xl font-semibold text-white">Empresas</h1>
        {empresas.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nenhuma empresa cadastrada ainda. Use a API (POST /api/empresas) para cadastrar a primeira.
          </p>
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
