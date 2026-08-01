import path from "path";
import fs from "fs";
import { createCanvas, loadImage, GlobalFonts, type SKRSContext2D, type Image } from "@napi-rs/canvas";
import { gerarUmaImagemBuffer } from "./gerarImagemFallback";

// Templates de carrossel "educativo" (passo-a-passo, texto direto na imagem, cor/logo da
// marca) — alternativa ao carrossel "narrativo" (sequência de fotos), pra quando o
// conteúdo é do tipo tutorial/dicas em vez de storytelling. Renderizado com canvas em vez
// de pedir pro modelo de imagem desenhar texto (tipografia de IA generativa não é confiável).

export type SlideEducativo =
  | { tipo: "capa"; titulo: string; bullets?: string[]; promptFoto?: string }
  | { tipo: "passo"; badge?: string; titulo: string; texto?: string; icone?: string; promptFoto?: string }
  | { tipo: "fechamento"; titulo: string; icone?: string };

type EmpresaParaSlide = { nome: string; logoUrl: string | null; brandGuidelines: unknown };

const TAMANHO = 1080;
const PASTA_MIDIA = path.join(__dirname, "../../uploads/conteudos");
fs.mkdirSync(PASTA_MIDIA, { recursive: true });

const FONTE_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const FONTE_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
let fontesRegistradas = false;

function garantirFontes() {
  if (fontesRegistradas) return;
  fontesRegistradas = true;
  try {
    GlobalFonts.registerFromPath(FONTE_REGULAR, "Slide");
    GlobalFonts.registerFromPath(FONTE_BOLD, "Slide Bold");
  } catch (erro) {
    console.warn("Não foi possível registrar fontes para os slides educativos:", erro);
  }
}

function hexParaRgb(hex: string): { r: number; g: number; b: number } {
  const limpo = hex.replace("#", "");
  return {
    r: parseInt(limpo.substring(0, 2), 16),
    g: parseInt(limpo.substring(2, 4), 16),
    b: parseInt(limpo.substring(4, 6), 16),
  };
}

function misturarComBranco(hex: string, fator: number): string {
  const { r, g, b } = hexParaRgb(hex);
  const nr = Math.round(r + (255 - r) * fator);
  const ng = Math.round(g + (255 - g) * fator);
  const nb = Math.round(b + (255 - b) * fator);
  return `rgb(${nr}, ${ng}, ${nb})`;
}

function comAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexParaRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function corPrimariaDe(brandGuidelines: unknown): string {
  if (brandGuidelines && typeof brandGuidelines === "object") {
    const cor = (brandGuidelines as Record<string, unknown>).corPrimaria;
    if (typeof cor === "string" && /^#[0-9a-fA-F]{6}$/.test(cor)) return cor;
  }
  return "#1f2937"; // slate-800 — neutro, legível em qualquer nicho quando a marca não define cor
}

function quebrarLinhas(ctx: SKRSContext2D, texto: string, larguraMax: number): string[] {
  const palavras = texto.split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let linhaAtual = "";
  for (const palavra of palavras) {
    const tentativa = linhaAtual ? `${linhaAtual} ${palavra}` : palavra;
    if (ctx.measureText(tentativa).width > larguraMax && linhaAtual) {
      linhas.push(linhaAtual);
      linhaAtual = palavra;
    } else {
      linhaAtual = tentativa;
    }
  }
  if (linhaAtual) linhas.push(linhaAtual);
  return linhas;
}

function desenharRetanguloArredondado(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function desenharFotoCover(ctx: SKRSContext2D, img: Image, x: number, y: number, w: number, h: number) {
  const escala = Math.max(w / img.width, h / img.height);
  const iw = img.width * escala;
  const ih = img.height * escala;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  ctx.restore();
}

function desenharIcone(ctx: SKRSContext2D, nome: string | undefined, cx: number, cy: number, raio: number, cor: string) {
  ctx.save();
  ctx.fillStyle = cor;
  ctx.strokeStyle = cor;
  switch (nome) {
    case "gota":
      ctx.beginPath();
      ctx.arc(cx, cy + raio * 0.2, raio * 0.75, 0, Math.PI * 2);
      ctx.moveTo(cx, cy - raio);
      ctx.lineTo(cx - raio * 0.55, cy - raio * 0.05);
      ctx.lineTo(cx + raio * 0.55, cy - raio * 0.05);
      ctx.closePath();
      ctx.fill();
      break;
    case "escudo":
      ctx.beginPath();
      ctx.moveTo(cx, cy - raio);
      ctx.lineTo(cx + raio, cy - raio * 0.55);
      ctx.lineTo(cx + raio, cy + raio * 0.1);
      ctx.quadraticCurveTo(cx + raio, cy + raio, cx, cy + raio * 1.1);
      ctx.quadraticCurveTo(cx - raio, cy + raio, cx - raio, cy + raio * 0.1);
      ctx.lineTo(cx - raio, cy - raio * 0.55);
      ctx.closePath();
      ctx.fill();
      break;
    case "check":
      ctx.lineWidth = raio * 0.28;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(cx - raio * 0.6, cy);
      ctx.lineTo(cx - raio * 0.1, cy + raio * 0.5);
      ctx.lineTo(cx + raio * 0.65, cy - raio * 0.5);
      ctx.stroke();
      break;
    case "estrela":
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? raio : raio * 0.45;
        const ang = (Math.PI / 5) * i - Math.PI / 2;
        const px = cx + Math.cos(ang) * r;
        const py = cy + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      break;
    case "coracao":
      ctx.beginPath();
      ctx.moveTo(cx, cy + raio * 0.8);
      ctx.bezierCurveTo(cx + raio * 1.3, cy + raio * 0.1, cx + raio * 0.6, cy - raio, cx, cy - raio * 0.25);
      ctx.bezierCurveTo(cx - raio * 0.6, cy - raio, cx - raio * 1.3, cy + raio * 0.1, cx, cy + raio * 0.8);
      ctx.fill();
      break;
    case "marcador":
      ctx.beginPath();
      ctx.moveTo(cx - raio * 0.6, cy - raio);
      ctx.lineTo(cx + raio * 0.6, cy - raio);
      ctx.lineTo(cx + raio * 0.6, cy + raio);
      ctx.lineTo(cx, cy + raio * 0.4);
      ctx.lineTo(cx - raio * 0.6, cy + raio);
      ctx.closePath();
      ctx.fill();
      break;
    case "folha":
    default:
      ctx.beginPath();
      ctx.moveTo(cx, cy - raio);
      ctx.bezierCurveTo(cx + raio, cy - raio, cx + raio, cy + raio, cx, cy + raio);
      ctx.bezierCurveTo(cx - raio, cy + raio, cx - raio, cy - raio, cx, cy - raio);
      ctx.fill();
      break;
  }
  ctx.restore();
}

async function desenharLogo(ctx: SKRSContext2D, empresa: EmpresaParaSlide, cx: number, cy: number, raio: number): Promise<boolean> {
  if (!empresa.logoUrl) return false;
  try {
    const caminho = path.join(__dirname, "../..", empresa.logoUrl);
    const img = await loadImage(caminho);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, raio, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(cx - raio, cy - raio, raio * 2, raio * 2);
    desenharFotoCover(ctx, img, cx - raio, cy - raio, raio * 2, raio * 2);
    ctx.restore();
    return true;
  } catch (erro) {
    console.warn("Não foi possível compor a logo no slide:", erro);
    return false;
  }
}

async function renderizarSlideCapa(
  empresa: EmpresaParaSlide,
  slide: Extract<SlideEducativo, { tipo: "capa" }>,
  fotoBuffer: Buffer | null,
): Promise<Buffer> {
  garantirFontes();
  const canvas = createCanvas(TAMANHO, TAMANHO);
  const ctx = canvas.getContext("2d");
  const cor = corPrimariaDe(empresa.brandGuidelines);
  const pad = 60;

  ctx.fillStyle = misturarComBranco(cor, 0.95);
  ctx.fillRect(0, 0, TAMANHO, TAMANHO);

  const fotoAltura = 520;
  if (fotoBuffer) {
    const img = await loadImage(fotoBuffer);
    ctx.save();
    desenharRetanguloArredondado(ctx, pad, pad, TAMANHO - pad * 2, fotoAltura, 28);
    ctx.clip();
    desenharFotoCover(ctx, img, pad, pad, TAMANHO - pad * 2, fotoAltura);
    ctx.restore();
  } else {
    desenharRetanguloArredondado(ctx, pad, pad, TAMANHO - pad * 2, fotoAltura, 28);
    ctx.fillStyle = misturarComBranco(cor, 0.55);
    ctx.fill();
  }

  ctx.font = "bold 58px 'Slide Bold'";
  const larguraTitulo = TAMANHO - pad * 2 - 80;
  const linhasTitulo = quebrarLinhas(ctx, slide.titulo, larguraTitulo);
  const alturaBanda = 40 + linhasTitulo.length * 68;
  const yBanda = pad + fotoAltura + 24;

  ctx.fillStyle = cor;
  desenharRetanguloArredondado(ctx, pad, yBanda, TAMANHO - pad * 2, alturaBanda, 24);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  let y = yBanda + 58;
  for (const linha of linhasTitulo) {
    ctx.fillText(linha, pad + 40, y);
    y += 68;
  }

  const bullets = (slide.bullets ?? []).slice(0, 3);
  if (bullets.length > 0) {
    const yBullets = yBanda + alturaBanda + 70;
    const larguraItem = (TAMANHO - pad * 2) / bullets.length;
    bullets.forEach((bullet, i) => {
      const cxIcone = pad + larguraItem * i + larguraItem / 2;
      ctx.fillStyle = misturarComBranco(cor, 0.8);
      ctx.beginPath();
      ctx.arc(cxIcone, yBullets, 42, 0, Math.PI * 2);
      ctx.fill();
      desenharIcone(ctx, ["check", "folha", "escudo"][i % 3], cxIcone, yBullets, 22, cor);

      ctx.font = "600 26px 'Slide Bold'";
      ctx.fillStyle = "#1f2937";
      ctx.textAlign = "center";
      const linhasBullet = quebrarLinhas(ctx, bullet.toUpperCase(), larguraItem - 20);
      let yTexto = yBullets + 70;
      for (const linha of linhasBullet.slice(0, 2)) {
        ctx.fillText(linha, cxIcone, yTexto);
        yTexto += 32;
      }
    });
  }

  await desenharLogo(ctx, empresa, TAMANHO - 90, 90, 40);

  return canvas.encode("jpeg", 90);
}

async function renderizarSlidePasso(
  empresa: EmpresaParaSlide,
  slide: Extract<SlideEducativo, { tipo: "passo" }>,
  fotoBuffer: Buffer | null,
): Promise<Buffer> {
  garantirFontes();
  const canvas = createCanvas(TAMANHO, TAMANHO);
  const ctx = canvas.getContext("2d");
  const cor = corPrimariaDe(empresa.brandGuidelines);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, TAMANHO, TAMANHO);

  const panelBase = TAMANHO * 0.52;

  if (fotoBuffer) {
    const img = await loadImage(fotoBuffer);
    desenharFotoCover(ctx, img, panelBase - 20, 0, TAMANHO - (panelBase - 20), TAMANHO);
  } else {
    ctx.fillStyle = misturarComBranco(cor, 0.65);
    ctx.fillRect(panelBase - 20, 0, TAMANHO - (panelBase - 20), TAMANHO);
  }

  const bulge = TAMANHO * 0.09;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(panelBase, 0);
  ctx.quadraticCurveTo(panelBase + bulge, TAMANHO / 2, panelBase, TAMANHO);
  ctx.lineTo(0, TAMANHO);
  ctx.closePath();
  ctx.fillStyle = misturarComBranco(cor, 0.93);
  ctx.fill();

  const margemEsq = 70;
  const larguraTexto = panelBase - margemEsq - 40;
  let y = 170;

  if (slide.badge) {
    ctx.font = "bold 30px 'Slide Bold'";
    const larguraBadge = ctx.measureText(slide.badge).width + 48;
    ctx.fillStyle = cor;
    desenharRetanguloArredondado(ctx, margemEsq, y, larguraBadge, 54, 27);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(slide.badge, margemEsq + 24, y + 27);
    y += 96;
  }

  ctx.font = "bold 62px 'Slide Bold'";
  ctx.fillStyle = cor;
  ctx.textBaseline = "alphabetic";
  const linhasTitulo = quebrarLinhas(ctx, slide.titulo, larguraTexto);
  for (const linha of linhasTitulo) {
    y += 62;
    ctx.fillText(linha, margemEsq, y);
  }
  y += 60;

  if (slide.icone) {
    ctx.fillStyle = misturarComBranco(cor, 0.8);
    ctx.beginPath();
    ctx.arc(margemEsq + 44, y, 44, 0, Math.PI * 2);
    ctx.fill();
    desenharIcone(ctx, slide.icone, margemEsq + 44, y, 24, cor);
    y += 90;
  }

  if (slide.texto) {
    ctx.font = "30px 'Slide'";
    ctx.fillStyle = "#374151";
    const linhasTexto = quebrarLinhas(ctx, slide.texto, larguraTexto);
    for (const linha of linhasTexto.slice(0, 5)) {
      ctx.fillText(linha, margemEsq, y);
      y += 42;
    }
  }

  return canvas.encode("jpeg", 90);
}

async function renderizarSlideFechamento(
  empresa: EmpresaParaSlide,
  slide: Extract<SlideEducativo, { tipo: "fechamento" }>,
): Promise<Buffer> {
  garantirFontes();
  const canvas = createCanvas(TAMANHO, TAMANHO);
  const ctx = canvas.getContext("2d");
  const cor = corPrimariaDe(empresa.brandGuidelines);

  ctx.fillStyle = cor;
  ctx.fillRect(0, 0, TAMANHO, TAMANHO);

  desenharIcone(ctx, slide.icone ?? "marcador", TAMANHO / 2, 320, 60, "#ffffff");

  ctx.font = "bold 60px 'Slide Bold'";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const linhasTitulo = quebrarLinhas(ctx, slide.titulo, TAMANHO - 200);
  let y = 470;
  for (const linha of linhasTitulo) {
    ctx.fillText(linha, TAMANHO / 2, y);
    y += 74;
  }

  ctx.font = "34px 'Slide'";
  ctx.fillStyle = comAlpha("#ffffff", 0.85);
  ctx.fillText(`Siga e acompanhe ${empresa.nome}`, TAMANHO / 2, y + 50);

  const teveLogo = await desenharLogo(ctx, empresa, TAMANHO / 2, TAMANHO - 160, 70);
  if (!teveLogo) {
    ctx.font = "bold 44px 'Slide Bold'";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(empresa.nome, TAMANHO / 2, TAMANHO - 140);
  }

  return canvas.encode("jpeg", 90);
}

// Gera cada slide na ordem, pulando os que falharem (ex: geração de foto de fundo
// indisponível) em vez de derrubar o carrossel inteiro.
export async function renderizarCarrosselEducativo(
  conteudoId: string,
  empresa: EmpresaParaSlide,
  slides: SlideEducativo[],
): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    try {
      let fotoBuffer: Buffer | null = null;
      if ((slide.tipo === "capa" || slide.tipo === "passo") && slide.promptFoto) {
        fotoBuffer = await gerarUmaImagemBuffer(slide.promptFoto);
      }

      let buffer: Buffer;
      if (slide.tipo === "capa") buffer = await renderizarSlideCapa(empresa, slide, fotoBuffer);
      else if (slide.tipo === "passo") buffer = await renderizarSlidePasso(empresa, slide, fotoBuffer);
      else buffer = await renderizarSlideFechamento(empresa, slide);

      const nomeArquivo = `${conteudoId}-edu${i + 1}-${Date.now()}.jpg`;
      fs.writeFileSync(path.join(PASTA_MIDIA, nomeArquivo), buffer);
      urls.push(`/uploads/conteudos/${nomeArquivo}`);
    } catch (erro) {
      console.warn(`Slide educativo ${i + 1}/${slides.length} do carrossel ${conteudoId} falhou ao renderizar — pulando:`, erro);
    }
  }
  return urls;
}
