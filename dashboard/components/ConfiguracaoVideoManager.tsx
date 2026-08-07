"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Video } from "lucide-react";
import { getConfiguracaoVideo, salvarConfiguracaoVideo, type ModeloVideo } from "@/lib/api";

function parametrosPadraoDoModelo(modelo: ModeloVideo): Record<string, string | number | boolean> {
  const parametros: Record<string, string | number | boolean> = {};
  for (const campo of modelo.campos) parametros[campo.chave] = campo.padrao;
  return parametros;
}

export function ConfiguracaoVideoManager() {
  const [catalogo, setCatalogo] = useState<ModeloVideo[]>([]);
  const [slugSelecionado, setSlugSelecionado] = useState("");
  const [parametros, setParametros] = useState<Record<string, string | number | boolean>>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  useEffect(() => {
    getConfiguracaoVideo().then((config) => {
      setCatalogo(config.catalogo);
      setSlugSelecionado(config.modelo || config.catalogo[0]?.slug || "");
      setParametros(config.parametros);
      setCarregando(false);
    });
  }, []);

  const modeloSelecionado = catalogo.find((m) => m.slug === slugSelecionado);

  function trocarModelo(slug: string) {
    const modelo = catalogo.find((m) => m.slug === slug);
    setSlugSelecionado(slug);
    setParametros(modelo ? parametrosPadraoDoModelo(modelo) : {});
    setMensagem(null);
  }

  async function salvar() {
    if (!modeloSelecionado) return;
    setSalvando(true);
    setMensagem(null);
    const resultado = await salvarConfiguracaoVideo(slugSelecionado, parametros);
    setSalvando(false);
    setMensagem(
      resultado.ok
        ? { tipo: "sucesso", texto: "Configuração salva — os próximos vídeos já usam esse modelo." }
        : { tipo: "erro", texto: resultado.erro ?? "Não foi possível salvar." },
    );
  }

  if (carregando) {
    return <div className="rounded-xl border border-border bg-panel p-4 text-xs text-gray-500">Carregando...</div>;
  }

  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <div className="mb-1 flex items-center gap-2">
        <Video size={16} className="text-blue-400" />
        <h2 className="text-sm font-semibold text-white">Geração de vídeo</h2>
      </div>
      <p className="mb-4 text-xs text-gray-500">
        Modelo do Replicate usado pra gerar os vídeos curtos/reels. Trocar aqui não exige deploy — vale já na
        próxima geração.
      </p>

      <div className="mb-4">
        <label className="mb-1 block text-[11px] uppercase tracking-wide text-gray-500">Modelo</label>
        <select
          value={slugSelecionado}
          onChange={(e) => trocarModelo(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-2.5 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {catalogo.map((modelo) => (
            <option key={modelo.slug} value={modelo.slug}>
              {modelo.nome}
            </option>
          ))}
        </select>
      </div>

      {modeloSelecionado && (
        <>
          <div className="mb-4 rounded-md bg-surface p-3">
            <p className="mb-1 text-xs text-gray-300">{modeloSelecionado.descricao}</p>
            <a
              href={modeloSelecionado.urlDocumentacao}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300"
            >
              Ver documentação do modelo <ExternalLink size={11} />
            </a>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {modeloSelecionado.campos.map((campo) => (
              <div key={campo.chave}>
                <label className="mb-1 block text-[11px] uppercase tracking-wide text-gray-500">{campo.label}</label>

                {campo.tipo === "select" && (
                  <select
                    value={String(parametros[campo.chave] ?? campo.padrao)}
                    onChange={(e) => setParametros((p) => ({ ...p, [campo.chave]: e.target.value }))}
                    className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {campo.opcoes.map((opcao) => (
                      <option key={opcao} value={opcao}>
                        {opcao}
                      </option>
                    ))}
                  </select>
                )}

                {campo.tipo === "numero" && (
                  <input
                    type="number"
                    min={campo.min}
                    max={campo.max}
                    value={Number(parametros[campo.chave] ?? campo.padrao)}
                    onChange={(e) => setParametros((p) => ({ ...p, [campo.chave]: Number(e.target.value) }))}
                    className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}

                {campo.tipo === "booleano" && (
                  <label className="flex items-center gap-2 py-1.5 text-xs text-gray-300">
                    <input
                      type="checkbox"
                      checked={Boolean(parametros[campo.chave] ?? campo.padrao)}
                      onChange={(e) => setParametros((p) => ({ ...p, [campo.chave]: e.target.checked }))}
                      className="h-3.5 w-3.5 rounded border-border bg-surface accent-blue-600"
                    />
                    {campo.label}
                  </label>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex items-center justify-between">
        {mensagem && (
          <p className={`text-xs ${mensagem.tipo === "sucesso" ? "text-green-400" : "text-red-400"}`}>
            {mensagem.texto}
          </p>
        )}
        <button
          type="button"
          onClick={salvar}
          disabled={salvando || !modeloSelecionado}
          className="ml-auto rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}
