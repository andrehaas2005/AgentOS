// Catálogo dos sprites de mobília/decoração disponíveis no editor do
// Escritório de Agentes — cada entrada vira uma miniatura clicável na paleta.
// Mantido separado dos sprites de personagem (esses vêm de lib/agentes.ts e
// não são "objetos" colocáveis, são atribuídos via mesa/agente).

export type CategoriaObjeto = "parede" | "moveis" | "plantas";

export type ItemPaleta = {
  id: string;
  sprite: string;
  label: string;
  categoria: CategoriaObjeto;
  larguraPadrao: number;
  camada: "parede" | "objeto";
};

export const CATEGORIAS_PALETA: { id: CategoriaObjeto; label: string }[] = [
  { id: "parede", label: "Parede" },
  { id: "moveis", label: "Móveis" },
  { id: "plantas", label: "Plantas" },
];

export const PALETA_OBJETOS: ItemPaleta[] = [
  // Parede
  { id: "estante", sprite: "estante.png", label: "Estante", categoria: "parede", larguraPadrao: 7, camada: "parede" },
  { id: "quadro-branco", sprite: "quadro-branco.png", label: "Quadro branco", categoria: "parede", larguraPadrao: 7, camada: "parede" },
  { id: "quadro", sprite: "quadro.png", label: "Quadro", categoria: "parede", larguraPadrao: 8, camada: "parede" },
  { id: "quadro-a", sprite: "quadro-a.png", label: "Quadro (A)", categoria: "parede", larguraPadrao: 10, camada: "parede" },
  { id: "quadro-b", sprite: "quadro-b.png", label: "Quadro (B)", categoria: "parede", larguraPadrao: 10, camada: "parede" },
  { id: "quadro-c", sprite: "quadro-c.png", label: "Quadro (C)", categoria: "parede", larguraPadrao: 10, camada: "parede" },
  { id: "relogio", sprite: "relogio.png", label: "Relógio", categoria: "parede", larguraPadrao: 5, camada: "parede" },
  { id: "porta", sprite: "porta.png", label: "Porta", categoria: "parede", larguraPadrao: 8, camada: "objeto" },

  // Móveis
  { id: "balcao", sprite: "balcao.png", label: "Balcão", categoria: "moveis", larguraPadrao: 12, camada: "objeto" },
  { id: "bench", sprite: "bench.png", label: "Banco", categoria: "moveis", larguraPadrao: 9, camada: "objeto" },
  { id: "cabinet", sprite: "cabinet.png", label: "Armário", categoria: "moveis", larguraPadrao: 8, camada: "objeto" },
  { id: "cafe-prop", sprite: "cafe-prop.png", label: "Máquina de café", categoria: "moveis", larguraPadrao: 7, camada: "objeto" },
  { id: "chair", sprite: "chair.png", label: "Cadeira", categoria: "moveis", larguraPadrao: 7, camada: "objeto" },
  { id: "cushion", sprite: "cushion.png", label: "Almofada", categoria: "moveis", larguraPadrao: 6, camada: "objeto" },
  { id: "desk-monitor", sprite: "desk-monitor.png", label: "Monitor", categoria: "moveis", larguraPadrao: 6, camada: "objeto" },
  { id: "lixeira", sprite: "lixeira.png", label: "Lixeira", categoria: "moveis", larguraPadrao: 5, camada: "objeto" },
  { id: "mesa-centro", sprite: "mesa-centro.png", label: "Mesa de centro", categoria: "moveis", larguraPadrao: 7, camada: "objeto" },
  { id: "mesa-trabalho", sprite: "mesa-trabalho.png", label: "Mesa de trabalho", categoria: "moveis", larguraPadrao: 12, camada: "objeto" },
  { id: "sofa", sprite: "sofa.png", label: "Sofá", categoria: "moveis", larguraPadrao: 10, camada: "objeto" },
  { id: "tapete", sprite: "tapete.png", label: "Tapete", categoria: "moveis", larguraPadrao: 16, camada: "objeto" },

  // Plantas
  { id: "plant", sprite: "plant.png", label: "Planta", categoria: "plantas", larguraPadrao: 7, camada: "parede" },
];

export function encontrarItemPaleta(sprite: string): ItemPaleta | undefined {
  return PALETA_OBJETOS.find((item) => item.sprite === sprite);
}

// Texturas de piso disponíveis pra cada sala (usadas no seletor de piso, não
// na paleta de objetos — repetem via CSS background-image, não são <img>).
export const PISOS_DISPONIVEIS: { sprite: string; label: string }[] = [
  { sprite: "floor-wood.png", label: "Madeira" },
  { sprite: "floor-lounge.png", label: "Lounge" },
  { sprite: "floor-tan.png", label: "Bege" },
  { sprite: "floor-checker.png", label: "Xadrez" },
];
