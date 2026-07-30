"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { X } from "lucide-react";
import { atualizarEmpresa, criarEmpresa, enviarLogoEmpresa, type Empresa } from "@/lib/api";
import { EmpresaAvatar } from "./EmpresaAvatar";
import { ContaSocialManager } from "./ContaSocialManager";

type Props = {
  empresa?: Empresa;
  onClose: () => void;
};

export function EmpresaForm({ empresa, onClose }: Props) {
  const router = useRouter();
  const inputLogoRef = useRef<HTMLInputElement>(null);
  const [empresaAtual, setEmpresaAtual] = useState(empresa);
  const [nome, setNome] = useState(empresa?.nome ?? "");
  const [nicho, setNicho] = useState(empresa?.nicho ?? "");
  const [tomDeVoz, setTomDeVoz] = useState(empresa?.tomDeVoz ?? "");
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (!nome.trim()) {
      setErro("O nome é obrigatório.");
      return;
    }
    setSalvando(true);
    setErro(null);

    const dados = {
      nome: nome.trim(),
      nicho: nicho.trim() || undefined,
      tomDeVoz: tomDeVoz.trim() || undefined,
    };

    if (empresaAtual) {
      const resultado = await atualizarEmpresa(empresaAtual.id, dados);
      setSalvando(false);
      if (!resultado.ok) {
        setErro(resultado.erro ?? "Erro ao salvar.");
        return;
      }
      router.refresh();
      return;
    }

    const resultado = await criarEmpresa(dados);
    setSalvando(false);
    if (!resultado.ok || !resultado.empresa) {
      setErro(resultado.erro ?? "Erro ao salvar.");
      return;
    }
    // Continua no modal, agora em modo edição, pra permitir cadastrar logo/redes sociais.
    setEmpresaAtual(resultado.empresa);
    router.refresh();
  }

  async function aoEscolherLogo(arquivo: File | undefined) {
    if (!arquivo || !empresaAtual) return;
    setPreviewLogo(URL.createObjectURL(arquivo));
    setEnviandoLogo(true);
    await enviarLogoEmpresa(empresaAtual.id, arquivo);
    setEnviandoLogo(false);
    router.refresh();
  }

  function concluir() {
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-xl border border-border bg-panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            {empresaAtual ? `Editar ${empresaAtual.nome}` : "Nova empresa"}
          </h3>
          <button
            type="button"
            onClick={concluir}
            className="rounded-lg p-1 text-gray-400 hover:bg-surface hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {empresaAtual && (
          <div className="mb-4 flex items-center gap-3">
            <EmpresaAvatar
              nome={empresaAtual.nome}
              logoUrl={previewLogo ?? empresaAtual.logoUrl}
              size={48}
            />
            <div>
              <button
                type="button"
                onClick={() => inputLogoRef.current?.click()}
                disabled={enviandoLogo}
                className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-gray-300 hover:text-white disabled:opacity-50"
              >
                {enviandoLogo ? "Enviando..." : "Trocar logo"}
              </button>
              <input
                ref={inputLogoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => aoEscolherLogo(e.target.files?.[0])}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Nome
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              placeholder="ex: mksh.consultoria"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Nicho
            <input
              value={nicho}
              onChange={(e) => setNicho(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              placeholder="ex: marketing digital"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Tom de voz
            <input
              value={tomDeVoz}
              onChange={(e) => setTomDeVoz(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              placeholder="ex: profissional e consultivo"
            />
          </label>
        </div>

        {erro && <p className="mt-3 text-xs text-red-400">{erro}</p>}

        <div className="mt-4 flex justify-end gap-2">
          {empresaAtual && (
            <button
              type="button"
              onClick={concluir}
              className="rounded-lg px-3 py-1.5 text-xs text-gray-400 hover:bg-surface hover:text-white"
            >
              Fechar
            </button>
          )}
          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>

        {empresaAtual && (
          <div className="mt-4 border-t border-border pt-4">
            <ContaSocialManager empresaId={empresaAtual.id} contasSociais={empresaAtual.contasSociais} />
          </div>
        )}
      </div>
    </div>
  );
}
