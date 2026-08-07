import { NextResponse } from "next/server";
import { NOME_COOKIE_SESSAO } from "@/lib/sessao";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(NOME_COOKIE_SESSAO, "", { path: "/", maxAge: 0 });
  return res;
}
