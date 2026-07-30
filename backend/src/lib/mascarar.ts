export function mascararValor(valor: string): string {
  if (valor.length <= 4) return "••••";
  return `••••${valor.slice(-4)}`;
}

export function mascararCredenciais(credenciais: unknown): unknown {
  if (!credenciais || typeof credenciais !== "object") return credenciais;
  const entradas = Object.entries(credenciais as Record<string, unknown>).map(([chave, valor]) => [
    chave,
    typeof valor === "string" ? mascararValor(valor) : valor,
  ]);
  return Object.fromEntries(entradas);
}
