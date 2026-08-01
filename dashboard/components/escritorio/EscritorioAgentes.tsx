"use client";

import { useEffect, useRef, useState } from "react";
import { AGENTES, SPRITE_POR_AGENTE } from "@/lib/agentes";
import { getAgentesStatus, getFrasesOciosas, type StatusAtivo, type FraseOciosa } from "@/lib/api";
import { PersonagemCena } from "./PersonagemCena";
import { PainelAgente } from "./PainelAgente";

// Um assento fixo na copa e uma mesa fixa por agente, pra ninguém se sobrepor
// conforme o número de agentes ativos muda. Coordenadas são % da cena inteira
// (sala de trabalho ocupa 0-55%, lounge ocupa 55-100%).
const POSICOES: Record<string, { copa: { x: number; y: number }; mesa: { x: number; y: number } }> = {
  CEO: { copa: { x: 60, y: 25 }, mesa: { x: 16, y: 20 } },
  "Estrategista de Conteúdo": { copa: { x: 95, y: 25 }, mesa: { x: 16, y: 40 } },
  Redator: { copa: { x: 58, y: 85 }, mesa: { x: 16, y: 60 } },
  "Diretor de Arte": { copa: { x: 70, y: 90 }, mesa: { x: 16, y: 80 } },
  "Diretor de Vídeo": { copa: { x: 85, y: 90 }, mesa: { x: 40, y: 30 } },
  "Revisor de Marca": { copa: { x: 95, y: 60 }, mesa: { x: 40, y: 50 } },
  Publicador: { copa: { x: 60, y: 60 }, mesa: { x: 40, y: 70 } },
};

const DESKS = Object.values(POSICOES).map((pos) => pos.mesa);

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

type Fala = { texto: string; expira: number };

export function EscritorioAgentes({ altura = "h-[320px]" }: { altura?: string }) {
  const [ativos, setAtivos] = useState<StatusAtivo[]>([]);
  const [frases, setFrases] = useState<FraseOciosa[]>([]);
  const [falasOciosos, setFalasOciosos] = useState<Record<string, Fala>>({});
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [passeioOcioso, setPasseioOcioso] = useState<Record<string, { x: number; y: number }>>({});
  const [ficouOciosoEm, setFicouOciosoEm] = useState<Record<string, number>>({});

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

  const ativoPorNome = new Map(ativos.map((ativo) => [ativo.agente, ativo]));

  // Ref pra o intervalo de passeio (6s) ler sempre quem está ativo agora sem
  // precisar reiniciar a cada 4s (quando o polling de status muda `ativos`) —
  // um intervalo de período maior que o do polling nunca dispararia se
  // dependesse de `ativos` diretamente no array de dependências do efeito.
  const ativoPorNomeRef = useRef(ativoPorNome);
  ativoPorNomeRef.current = ativoPorNome;

  const frasesRef = useRef(frases);
  frasesRef.current = frases;

  useEffect(() => {
    const id = setInterval(() => {
      setFalasOciosos((prev) => {
        const agora = Date.now();
        const proximo: Record<string, Fala> = {};
        for (const [nome, fala] of Object.entries(prev)) {
          if (fala.expira > agora) proximo[nome] = fala;
        }
        const ociosos = AGENTES.map((a) => a.nome).filter(
          (nome) => !ativoPorNome.has(nome) && !proximo[nome],
        );
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
      for (const agente of AGENTES) {
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
  }, [ativos]);

  // A cada rodada, cada agente ocioso tem uma chance de "passear" pra um ponto
  // aleatório próximo dentro da copa — evita a cena parecer estática demais.
  // Volta pro assento oficial assim que entra em atividade (removido do estado).
  useEffect(() => {
    const id = setInterval(() => {
      setPasseioOcioso((prev) => {
        const proximo = { ...prev };
        for (const agente of AGENTES) {
          const nome = agente.nome;
          const pos = POSICOES[nome];
          if (!pos) continue;
          if (ativoPorNomeRef.current.has(nome)) {
            delete proximo[nome];
            continue;
          }
          if (Math.random() < 0.4) {
            proximo[nome] = pontoProximo(pos.copa);
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

      {/* sala de trabalho (esquerda) */}
      <div
        className="absolute inset-y-0 left-0 z-0 w-[55%] border-r border-border/60"
        style={{
          backgroundImage: "url(/sprites/floor-wood.png)",
          backgroundSize: "40px 40px",
          imageRendering: "pixelated",
        }}
      >
        <span className="absolute left-2 top-7 z-10 rounded bg-black/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-300">
          Mesas de trabalho
        </span>

        {/* decoração na parede */}
        {[
          { src: "plant.png", x: 5, w: 7 },
          { src: "estante.png", x: 15, w: 7 },
          { src: "quadro-branco.png", x: 26, w: 7 },
          { src: "relogio.png", x: 36, w: 5 },
          { src: "plant.png", x: 47, w: 7 },
        ].map((item, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`decor-trabalho-${i}`}
            src={`/sprites/${item.src}`}
            alt=""
            className="absolute top-0 z-10 -translate-x-1/2"
            style={{ left: `${item.x}%`, width: `${item.w}%`, imageRendering: "pixelated" }}
          />
        ))}

        {/* porta e lixeira na lateral esquerda */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sprites/porta.png"
          alt=""
          className="absolute left-[2%] top-[45%] z-10 w-8"
          style={{ imageRendering: "pixelated" }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sprites/lixeira.png"
          alt=""
          className="absolute left-[3%] top-[68%] z-10 w-5"
          style={{ imageRendering: "pixelated" }}
        />

        {/* mesinha extra + banco no canto inferior direito */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sprites/cabinet.png"
          alt=""
          className="absolute left-[48%] top-[86%] z-10 w-8 -translate-x-1/2"
          style={{ imageRendering: "pixelated" }}
        />

        {/* cadeiras: atrás dos personagens */}
        {DESKS.map((pos, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`cadeira-${i}`}
            src="/sprites/chair.png"
            alt=""
            className="absolute z-10 w-7 -translate-x-1/2"
            style={{ left: `${pos.x}%`, top: `${pos.y - 3}%`, imageRendering: "pixelated" }}
          />
        ))}
      </div>

      {/* lounge (direita) */}
      <div
        className="absolute inset-y-0 right-0 z-0 w-[45%]"
        style={{
          backgroundImage: "url(/sprites/floor-lounge.png)",
          backgroundSize: "40px 40px",
          imageRendering: "pixelated",
        }}
      >
        <span className="absolute left-2 top-7 z-10 rounded bg-black/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-300">
          Copa
        </span>

        {/* faixa xadrez na base, decorativa */}
        <div
          className="absolute inset-x-0 bottom-0 z-0 h-8"
          style={{
            backgroundImage: "url(/sprites/floor-checker.png)",
            backgroundSize: "28px 28px",
            imageRendering: "pixelated",
          }}
        />

        {/* decoração na parede */}
        {[
          { src: "plant.png", x: 8, w: 12 },
          { src: "quadro-a.png", x: 30, w: 10 },
          { src: "quadro-b.png", x: 50, w: 10 },
          { src: "quadro-c.png", x: 70, w: 10 },
          { src: "plant.png", x: 92, w: 12 },
        ].map((item, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`decor-lounge-${i}`}
            src={`/sprites/${item.src}`}
            alt=""
            className="absolute top-0 z-10 -translate-x-1/2"
            style={{ left: `${item.x}%`, width: `${item.w}%`, imageRendering: "pixelated" }}
          />
        ))}

        {/* pit de sofás ao redor da mesinha de centro */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sprites/sofa.png"
          alt=""
          className="absolute left-1/2 top-[32%] z-10 w-10 -translate-x-1/2"
          style={{ imageRendering: "pixelated" }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sprites/sofa.png"
          alt=""
          className="absolute left-[28%] top-[46%] z-10 w-10 -translate-x-1/2 rotate-90"
          style={{ imageRendering: "pixelated" }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sprites/sofa.png"
          alt=""
          className="absolute left-[72%] top-[46%] z-10 w-10 -translate-x-1/2 -rotate-90"
          style={{ imageRendering: "pixelated" }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sprites/sofa.png"
          alt=""
          className="absolute left-1/2 top-[62%] z-10 w-10 -translate-x-1/2 rotate-180"
          style={{ imageRendering: "pixelated" }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sprites/mesa-centro.png"
          alt=""
          className="absolute left-1/2 top-[48%] z-10 w-7 -translate-x-1/2"
          style={{ imageRendering: "pixelated" }}
        />
      </div>

      {/* personagens: entre as cadeiras (atrás) e as mesas (na frente), pra simular "sentado" */}
      {AGENTES.map((agente) => {
        const ativo = ativoPorNome.get(agente.nome);
        const pos = POSICOES[agente.nome];
        if (!pos) return null;
        const desde = ficouOciosoEm[agente.nome];
        const aindaNaMesa = !ativo && desde !== undefined && Date.now() - desde < AGUARDAR_ANTES_DE_SAIR_MS;
        const alvo = ativo || aindaNaMesa ? pos.mesa : (passeioOcioso[agente.nome] ?? pos.copa);

        return (
          <PersonagemCena
            key={agente.nome}
            nome={agente.nome}
            sprite={SPRITE_POR_AGENTE[agente.nome]}
            x={alvo.x}
            y={alvo.y}
            ativo={Boolean(ativo)}
            fala={falaPara(agente.nome, ativo)}
            onClick={() => setSelecionado(agente.nome)}
          />
        );
      })}

      {/* mesas com monitor: na frente dos personagens, esconde as "pernas" */}
      {DESKS.map((pos, i) => (
        <div
          key={`mesa-${i}`}
          className="absolute z-20 w-12 -translate-x-1/2"
          style={{ left: `${pos.x}%`, top: `${pos.y + 12}%` }}
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
