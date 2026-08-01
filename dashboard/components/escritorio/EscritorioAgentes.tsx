"use client";

import { useEffect, useRef, useState } from "react";
import { agentesCompletos, spriteDoAgente } from "@/lib/agentes";
import {
  getAgentesCustomizados,
  getAgentesStatus,
  getFrasesOciosas,
  getLayoutEscritorio,
  type AgenteCustomizado,
  type FraseOciosa,
  type StatusAtivo,
} from "@/lib/api";
import { LAYOUT_ESCRITORIO_PADRAO, type LayoutEscritorioDados } from "@/lib/layoutEscritorioPadrao";
import { PersonagemCena } from "./PersonagemCena";
import { PainelAgente } from "./PainelAgente";

// Limites da copa (sala da direita) — evita que o passeio ocioso jogue o
// personagem pra cima da parede ou da sala de trabalho.
const LIMITES_COPA = { xMin: 58, xMax: 97, yMin: 22, yMax: 92 };

// Quanto tempo o agente fica parado na mesa depois de terminar antes de sair
// andando pra copa — o status (bolinha verde/laranja) muda na hora, só o
// deslocamento físico que espera esse tempo.
const AGUARDAR_ANTES_DE_SAIR_MS = 60000;

function fraseAleatoriaPara(nomeAgente: string, frases: FraseOciosa[]): string | undefined {
  const elegiveis = frases.filter((f) => f.agentes.length === 0 || f.agentes.includes(nomeAgente));
  if (elegiveis.length === 0) return undefined;
  return elegiveis[Math.floor(Math.random() * elegiveis.length)].texto;
}

function pontoProximo(base: { x: number; y: number }): { x: number; y: number } {
  const x = base.x + (Math.random() * 16 - 8);
  const y = base.y + (Math.random() * 20 - 10);
  return {
    x: Math.min(LIMITES_COPA.xMax, Math.max(LIMITES_COPA.xMin, x)),
    y: Math.min(LIMITES_COPA.yMax, Math.max(LIMITES_COPA.yMin, y)),
  };
}

function backgroundSizeParaTextura(textura: string): string {
  return textura === "floor-checker.png" ? "28px 28px" : "40px 40px";
}

type Fala = { texto: string; expira: number };

export function EscritorioAgentes({ altura = "h-[320px]" }: { altura?: string }) {
  const [layout, setLayout] = useState<LayoutEscritorioDados>(LAYOUT_ESCRITORIO_PADRAO);
  const [customizados, setCustomizados] = useState<AgenteCustomizado[]>([]);
  const [ativos, setAtivos] = useState<StatusAtivo[]>([]);
  const [frases, setFrases] = useState<FraseOciosa[]>([]);
  const [falasOciosos, setFalasOciosos] = useState<Record<string, Fala>>({});
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [passeioOcioso, setPasseioOcioso] = useState<Record<string, { x: number; y: number }>>({});
  const [ficouOciosoEm, setFicouOciosoEm] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelado = false;
    async function buscar() {
      const [dadosLayout, dadosCustomizados] = await Promise.all([
        getLayoutEscritorio(),
        getAgentesCustomizados(),
      ]);
      if (!cancelado) {
        setLayout(dadosLayout);
        setCustomizados(dadosCustomizados);
      }
    }
    buscar();
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;
    async function buscar() {
      const dados = await getAgentesStatus();
      if (!cancelado) setAtivos(dados);
    }
    buscar();
    const id = setInterval(buscar, 4000);
    return () => {
      cancelado = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let cancelado = false;
    async function buscar() {
      const dados = await getFrasesOciosas();
      if (!cancelado) setFrases(dados);
    }
    buscar();
    const id = setInterval(buscar, 60000);
    return () => {
      cancelado = true;
      clearInterval(id);
    };
  }, []);

  const agentes = agentesCompletos(customizados);
  const mesaPorAgente = new Map(layout.mesas.map((mesa) => [mesa.agenteId, mesa]));
  const ativoPorNome = new Map(ativos.map((ativo) => [ativo.agente, ativo]));

  // Refs pra os intervalos (6s/2.2s) lerem sempre o estado mais recente sem
  // precisar reiniciar a cada 4s (quando o polling de status muda `ativos`) —
  // um intervalo de período maior que o do polling nunca dispararia se
  // dependesse desses valores diretamente no array de dependências do efeito.
  const ativoPorNomeRef = useRef(ativoPorNome);
  ativoPorNomeRef.current = ativoPorNome;

  const frasesRef = useRef(frases);
  frasesRef.current = frases;

  const agentesRef = useRef(agentes);
  agentesRef.current = agentes;

  const mesaPorAgenteRef = useRef(mesaPorAgente);
  mesaPorAgenteRef.current = mesaPorAgente;

  useEffect(() => {
    const id = setInterval(() => {
      setFalasOciosos((prev) => {
        const agora = Date.now();
        const proximo: Record<string, Fala> = {};
        for (const [nome, fala] of Object.entries(prev)) {
          if (fala.expira > agora) proximo[nome] = fala;
        }
        const ociosos = agentesRef.current
          .map((a) => a.nome)
          .filter((nome) => !ativoPorNome.has(nome) && !proximo[nome]);
        if (ociosos.length > 0 && Object.keys(proximo).length < 2 && Math.random() < 0.5) {
          const nome = ociosos[Math.floor(Math.random() * ociosos.length)];
          const texto = fraseAleatoriaPara(nome, frasesRef.current);
          if (texto) proximo[nome] = { texto, expira: agora + 4500 };
        }
        return proximo;
      });
    }, 2200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativos]);

  // Marca o instante em que cada agente deixou de estar ativo — usado só pra
  // segurar o deslocamento físico até a mesa, sem atrasar a bolinha de status.
  useEffect(() => {
    setFicouOciosoEm((prev) => {
      let mudou = false;
      const proximo = { ...prev };
      for (const agente of agentes) {
        const nome = agente.nome;
        if (ativoPorNome.has(nome)) {
          if (proximo[nome] !== undefined) {
            delete proximo[nome];
            mudou = true;
          }
        } else if (proximo[nome] === undefined) {
          proximo[nome] = Date.now();
          mudou = true;
        }
      }
      return mudou ? proximo : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativos, customizados]);

  // A cada rodada, cada agente ocioso tem uma chance de "passear" pra um ponto
  // aleatório próximo dentro da copa — evita a cena parecer estática demais.
  // Volta pro assento oficial assim que entra em atividade (removido do estado).
  useEffect(() => {
    const id = setInterval(() => {
      setPasseioOcioso((prev) => {
        const proximo = { ...prev };
        for (const agente of agentesRef.current) {
          const nome = agente.nome;
          const mesa = mesaPorAgenteRef.current.get(nome);
          if (!mesa) continue;
          if (ativoPorNomeRef.current.has(nome)) {
            delete proximo[nome];
            continue;
          }
          if (Math.random() < 0.4) {
            proximo[nome] = pontoProximo({ x: mesa.copaX, y: mesa.copaY });
          }
        }
        return proximo;
      });
    }, 6000);
    return () => clearInterval(id);
  }, []);

  function falaPara(nome: string, ativo: StatusAtivo | undefined): string | undefined {
    if (ativo) {
      if (nome === "CEO") {
        const outroAtivo = ativos.find((a) => a.agente !== "CEO");
        return outroAtivo ? `Delegando para ${outroAtivo.agente}` : "Coordenando o time";
      }
      return ativo.descricao ?? `${nome} trabalhando`;
    }
    return falasOciosos[nome]?.texto;
  }

  const agenteSelecionado = selecionado ? ativoPorNome.get(selecionado) : undefined;

  return (
    <div className={`relative ${altura} w-full overflow-hidden rounded-lg border border-border bg-surface`}>
      {/* faixa de parede no topo, cobrindo as duas salas */}
      <div
        className="absolute inset-x-0 top-0 z-0 h-6"
        style={{
          backgroundImage: "url(/sprites/wall-tan.png)",
          backgroundSize: "32px 32px",
          imageRendering: "pixelated",
        }}
      />

      {/* salas: piso + decoração, na ordem do layout (última desenhada por cima) */}
      {layout.salas.map((sala) => (
        <div
          key={sala.id}
          className="absolute z-0"
          style={{
            left: `${sala.x}%`,
            top: `${sala.y}%`,
            width: `${sala.w}%`,
            height: `${sala.h}%`,
            backgroundImage: `url(/sprites/${sala.texturaPiso})`,
            backgroundSize: backgroundSizeParaTextura(sala.texturaPiso),
            imageRendering: "pixelated",
          }}
        >
          {sala.nome && (
            <span className="absolute left-2 top-1 z-10 rounded bg-black/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-300">
              {sala.nome}
            </span>
          )}

          {layout.objetos
            .filter((objeto) => objeto.salaId === sala.id)
            .map((objeto) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={objeto.id}
                src={`/sprites/${objeto.sprite}`}
                alt=""
                className="absolute z-10"
                style={{
                  left: `${objeto.x}%`,
                  top: objeto.camada === "parede" ? 0 : `${objeto.y}%`,
                  width: `${objeto.w}%`,
                  transform: `translateX(-50%) rotate(${objeto.rotacao ?? 0}deg)`,
                  imageRendering: "pixelated",
                }}
              />
            ))}
        </div>
      ))}

      {/* cadeiras: atrás dos personagens */}
      {layout.mesas.map((mesa) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`cadeira-${mesa.agenteId}`}
          src="/sprites/chair.png"
          alt=""
          className="absolute z-10 w-7 -translate-x-1/2"
          style={{ left: `${mesa.x}%`, top: `${mesa.y - 3}%`, imageRendering: "pixelated" }}
        />
      ))}

      {/* personagens: entre as cadeiras (atrás) e as mesas (na frente), pra simular "sentado" */}
      {agentes.map((agente) => {
        const ativo = ativoPorNome.get(agente.nome);
        const mesa = mesaPorAgente.get(agente.nome);
        if (!mesa) return null;
        const desde = ficouOciosoEm[agente.nome];
        const aindaNaMesa = !ativo && desde !== undefined && Date.now() - desde < AGUARDAR_ANTES_DE_SAIR_MS;
        const alvo =
          ativo || aindaNaMesa
            ? { x: mesa.x, y: mesa.y }
            : (passeioOcioso[agente.nome] ?? { x: mesa.copaX, y: mesa.copaY });

        return (
          <PersonagemCena
            key={agente.nome}
            nome={agente.nome}
            sprite={spriteDoAgente(agente.nome)}
            x={alvo.x}
            y={alvo.y}
            ativo={Boolean(ativo)}
            fala={falaPara(agente.nome, ativo)}
            onClick={() => setSelecionado(agente.nome)}
          />
        );
      })}

      {/* mesas com monitor: na frente dos personagens, esconde as "pernas" */}
      {layout.mesas.map((mesa) => (
        <div
          key={`mesa-${mesa.agenteId}`}
          className="absolute z-20 w-12 -translate-x-1/2"
          style={{ left: `${mesa.x}%`, top: `${mesa.y + 12}%` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sprites/mesa-trabalho.png"
            alt=""
            className="w-full"
            style={{ imageRendering: "pixelated" }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sprites/desk-monitor.png"
            alt=""
            className="absolute -top-4 left-1/2 w-6 -translate-x-1/2"
            style={{ imageRendering: "pixelated" }}
          />
        </div>
      ))}

      {selecionado && (
        <PainelAgente
          nome={selecionado}
          ativo={Boolean(agenteSelecionado)}
          descricaoAtiva={agenteSelecionado?.descricao ?? undefined}
          falaOciosa={falasOciosos[selecionado]?.texto}
          onClose={() => setSelecionado(null)}
        />
      )}
    </div>
  );
}
