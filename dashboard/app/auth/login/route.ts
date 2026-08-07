import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { criarTokenSessao, NOME_COOKIE_SESSAO, DURACAO_COOKIE_SEGUNDOS } from "@/lib/sessao";

// Fica em /auth/login (não /api/login) de propósito: nginx roteia tudo que começa com
// /api/ pro backend Express — isso aqui precisa rodar no próprio Next.js.
export async function POST(req: NextRequest) {
  const corpo = (await req.json().catch(() => null)) as { usuario?: string; senha?: string } | null;
  const usuarioEsperado = process.env.ADMIN_USER;
  const senhaEsperada = process.env.ADMIN_PASSWORD;

  if (!usuarioEsperado || !senhaEsperada) {
    return NextResponse.json({ error: "Login não configurado no servidor (ADMIN_USER/ADMIN_PASSWORD)." }, { status: 500 });
  }
  if (corpo?.usuario !== usuarioEsperado || corpo?.senha !== senhaEsperada) {
    return NextResponse.json({ error: "Usuário ou senha incorretos." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(NOME_COOKIE_SESSAO, criarTokenSessao(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_COOKIE_SEGUNDOS,
  });
  return res;
}
