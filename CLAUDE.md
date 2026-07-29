# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão geral do projeto

AgentOS é um sistema que gerencia um time de agentes de IA responsável por produzir e publicar
conteúdo em Instagram, Facebook, YouTube e LinkedIn, seguindo um cronograma configurado no próprio
sistema. Cada conta social (ex: cada Instagram) é modelada como uma **Empresa** independente, com
seu próprio nicho, tom de voz e calendário de postagens.

O plano completo de arquitetura está em `/Users/andrehaas/.claude/plans/elegant-gathering-mist.md`.

## Arquitetura

- `backend/` — API em Node.js + TypeScript (Express) com Prisma/PostgreSQL. Expõe `/api/empresas`,
  `/api/calendario` e `/api/dashboard` (stats + feed de eventos dos agentes).
- `dashboard/` — painel em Next.js (App Router) + Tailwind, tema escuro "Mission Control": tiles de
  KPI no topo, sidebar de navegação, grade de agentes, feed de eventos e cards de empresas.
- `nginx/` — reverse proxy (`/api` → backend, `/` → dashboard) para deploy na VPS Hostinger, domínio
  `andre.haas.nom.br`.
- `docker-compose.yml` — orquestra postgres, backend, dashboard e nginx.

Modelo de dados (Prisma, `backend/prisma/schema.prisma`): `Empresa` → `ContaSocial` (rede social
conectada) e `CalendarioItem` (item agendado, com `tipoPost`: imagem_frase, carrossel, animacao,
video_curto, stories, reels, post) → `Conteudo` (texto/mídia gerados) → `Publicacao` (registro da
publicação em cada rede). `ExecucaoAgente` registra cada chamada de agente (para o feed de eventos
e controle de custo).

Os agentes de IA (Agente CEO + subagentes especializados: Estrategista de Conteúdo, Redator,
Diretor de Arte, Diretor de Vídeo, Revisor de Marca, Publicador) ainda **não foram implementados** —
isso é a Fase 1 do plano. Hoje o sistema só tem a fundação (Fase 0): modelo de dados, API e dashboard.

## Comandos

Desenvolvimento local (sem Docker):
```bash
# backend
cd backend && npm install
cp ../.env.example .env  # ajuste DATABASE_URL
npm run prisma:migrate   # cria as tabelas
npm run dev              # API em http://localhost:4000

# dashboard (em outro terminal)
cd dashboard && npm install
npm run dev               # painel em http://localhost:3000
```

Com Docker Compose (stack completa: postgres + backend + dashboard + nginx):
```bash
cp .env.example .env
docker compose up --build
```

Build/produção:
```bash
cd backend && npm run build && npm start
cd dashboard && npm run build && npm start
```

## Notas para futuras instâncias

- Não implemente a lógica dos agentes de IA sem antes checar o plano em
  `/Users/andrehaas/.claude/plans/elegant-gathering-mist.md` — a orquestração deve usar o Claude
  Agent SDK, com o Agente CEO acionando os agentes especializados.
- Publicar de fato no Instagram/Facebook exige App Review da Meta (Graph API); no YouTube, OAuth por
  canal; no LinkedIn, aprovação do Marketing Developer Platform. Nenhuma dessas integrações reais
  está implementada ainda.
- Geração de imagem/vídeo depende de um provedor externo (Claude não gera mídia nativamente) — a
  escolha do provedor ainda está em aberto.
- O `.vscode/launch.json` original apontava para `localhost:8080`; o dashboard atual roda em
  `localhost:3000` e o backend em `localhost:4000` — atualize o launch.json se for depurar via VS Code.
