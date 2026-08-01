// Espelha dashboard/lib/layoutEscritorioPadrao.ts — usado só como seed da
// linha singleton de LayoutEscritorio na primeira chamada de GET (ver
// routes/escritorio.ts). Mudar o layout depois disso é feito via editor no
// dashboard e persistido no banco; este arquivo nunca mais é lido em produção.
export const LAYOUT_ESCRITORIO_PADRAO = {
  salas: [
    { id: "trabalho", nome: "Mesas de trabalho", x: 0, y: 0, w: 55, h: 100, texturaPiso: "floor-wood.png" },
    { id: "copa", nome: "Copa", x: 55, y: 0, w: 45, h: 100, texturaPiso: "floor-lounge.png" },
    { id: "faixa-copa", nome: "", x: 55, y: 92, w: 45, h: 8, texturaPiso: "floor-checker.png" },
  ],
  objetos: [
    { id: "plant-trabalho-1", salaId: "trabalho", sprite: "plant.png", x: 5, y: 0, w: 7, camada: "parede" },
    { id: "estante", salaId: "trabalho", sprite: "estante.png", x: 15, y: 0, w: 7, camada: "parede" },
    { id: "quadro-branco", salaId: "trabalho", sprite: "quadro-branco.png", x: 26, y: 0, w: 7, camada: "parede" },
    { id: "relogio", salaId: "trabalho", sprite: "relogio.png", x: 36, y: 0, w: 5, camada: "parede" },
    { id: "plant-trabalho-2", salaId: "trabalho", sprite: "plant.png", x: 47, y: 0, w: 7, camada: "parede" },

    { id: "porta", salaId: "trabalho", sprite: "porta.png", x: 2, y: 45, w: 7, camada: "objeto" },
    { id: "lixeira", salaId: "trabalho", sprite: "lixeira.png", x: 3, y: 68, w: 4, camada: "objeto" },
    { id: "cabinet", salaId: "trabalho", sprite: "cabinet.png", x: 48, y: 86, w: 7, camada: "objeto" },

    { id: "plant-copa-1", salaId: "copa", sprite: "plant.png", x: 8, y: 0, w: 12, camada: "parede" },
    { id: "quadro-a", salaId: "copa", sprite: "quadro-a.png", x: 30, y: 0, w: 10, camada: "parede" },
    { id: "quadro-b", salaId: "copa", sprite: "quadro-b.png", x: 50, y: 0, w: 10, camada: "parede" },
    { id: "quadro-c", salaId: "copa", sprite: "quadro-c.png", x: 70, y: 0, w: 10, camada: "parede" },
    { id: "plant-copa-2", salaId: "copa", sprite: "plant.png", x: 92, y: 0, w: 12, camada: "parede" },

    { id: "sofa-norte", salaId: "copa", sprite: "sofa.png", x: 50, y: 32, w: 10, camada: "objeto" },
    { id: "sofa-oeste", salaId: "copa", sprite: "sofa.png", x: 28, y: 46, w: 10, rotacao: 90, camada: "objeto" },
    { id: "sofa-leste", salaId: "copa", sprite: "sofa.png", x: 72, y: 46, w: 10, rotacao: -90, camada: "objeto" },
    { id: "sofa-sul", salaId: "copa", sprite: "sofa.png", x: 50, y: 62, w: 10, rotacao: 180, camada: "objeto" },
    { id: "mesa-centro", salaId: "copa", sprite: "mesa-centro.png", x: 50, y: 48, w: 7, camada: "objeto" },
  ],
  mesas: [
    { agenteId: "CEO", x: 16, y: 20, copaX: 60, copaY: 25 },
    { agenteId: "Estrategista de Conteúdo", x: 16, y: 40, copaX: 95, copaY: 25 },
    { agenteId: "Redator", x: 16, y: 60, copaX: 58, copaY: 85 },
    { agenteId: "Diretor de Arte", x: 16, y: 80, copaX: 70, copaY: 90 },
    { agenteId: "Diretor de Vídeo", x: 40, y: 30, copaX: 85, copaY: 90 },
    { agenteId: "Revisor de Marca", x: 40, y: 50, copaX: 95, copaY: 60 },
    { agenteId: "Publicador", x: 40, y: 70, copaX: 60, copaY: 60 },
  ],
};
