import { gerarImagem } from "./geminiClient";
import { gerarImagemReplicate } from "./replicateClient";

// Compartilhado entre o carrossel narrativo (foto inteira) e o carrossel educativo
// (foto usada como fundo do slide, composta com texto/ícones pelo slideRenderer).
export async function gerarUmaImagemBuffer(promptImagem: string): Promise<Buffer | null> {
  const promptFinal = `${promptImagem}\n\nA imagem deve ser fotorrealista e visualmente atraente (pessoas, natureza, ambientes reais), não um gráfico de texto genérico.`;
  try {
    return await gerarImagemReplicate(promptFinal);
  } catch (erroReplicate) {
    console.warn(`Geração de imagem via Replicate falhou, tentando Gemini: ${erroReplicate}`);
    try {
      return await gerarImagem(promptFinal);
    } catch (erroGemini) {
      console.warn(`Geração de imagem via Gemini também falhou (post seguirá sem mídia automática): ${erroGemini}`);
      return null;
    }
  }
}
