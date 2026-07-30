# AgentOS

Sistema que gerencia um time de agentes de IA responsável por produzir e publicar conteúdo em
Instagram, Facebook, YouTube e LinkedIn, seguindo um cronograma configurado no próprio sistema.
Cada conta social (um Instagram, uma página do Facebook, um canal do YouTube etc.) é modelada como
uma **Empresa** independente dentro da plataforma, com seu próprio nicho, tom de voz, guidelines de
marca e calendário de postagens.

A ideia central: um **Agente CEO** lê o calendário de cada empresa, decide o que precisa ser
produzido, e aciona os subagentes especializados certos (Estrategista de Conteúdo, Redator, Diretor
de Arte, Diretor de Vídeo, Revisor de Marca, Publicador) até o conteúdo estar pronto para publicação.

## Status atual

| Fase | Descrição | Situação |
|---|---|---|
| **Fase 0** | Fundação: modelo de dados, API REST, dashboard | ✅ Concluída |
| **Fase 1** | Agente CEO + subagentes gerando conteúdo real (sem publicar) | ✅ Concluída |
| **Fase 2** | MVP fim a fim: publicação real em 1 conta do Instagram | ⏳ Próxima |
| **Fase 3+** | Carrossel, stories, reels, mais empresas, YouTube, LinkedIn | 🔜 Planejado |

O que já funciona hoje, na prática:
- Cadastro de empresas, contas sociais e itens de calendário via API/dashboard
- O **Agente CEO** roda de verdade (via [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk)),
  delega para os subagentes certos conforme o tipo de post, e grava cada execução no banco
- O dashboard mostra tudo isso em tempo real, incluindo um **escritório em pixel art** na Visão
  Geral: os agentes aparecem trabalhando nas suas mesas quando estão executando de verdade, ou
  relaxando na copa quando ociosos — dá pra clicar em qualquer um deles pra ver o que fez recentemente

## Arquitetura

```
┌─────────────┐      ┌──────────────┐      ┌───────────────────┐
│   nginx     │──────▶  dashboard    │──────▶  backend (API)     │
│ reverse     │      │  Next.js      │      │  Express + Prisma  │
│ proxy       │      └──────────────┘      └─────────┬──────────┘
└─────────────┘                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │   PostgreSQL     │
                                              └─────────────────┘
```

- **`backend/`** — API em Node.js + TypeScript (Express) com Prisma/PostgreSQL. Expõe endpoints para
  empresas, calendário, conteúdos, publicações e agentes (`/api/empresas`, `/api/calendario`,
  `/api/conteudos`, `/api/publicacoes`, `/api/agentes`, `/api/dashboard`). É aqui também que mora a
  lógica do Agente CEO (`backend/src/agentes/`).
- **`dashboard/`** — painel em Next.js (App Router) + Tailwind, tema escuro "Mission Control": KPIs,
  calendário, conteúdos gerados, publicações, e a página de Agentes com o escritório animado.
- **`nginx/`** — reverse proxy (`/api` → backend, `/` → dashboard) para deploy em produção.
- **`docker-compose.yml`** — orquestra Postgres, backend, dashboard e nginx.

Modelo de dados principal (Prisma): `Empresa` → `ContaSocial` + `CalendarioItem` → `Conteudo` →
`Publicacao`, mais `ExecucaoAgente` (log de cada chamada de agente, usado tanto para observabilidade
quanto para alimentar o escritório em pixel art do dashboard).

## Como rodar

### Localmente, sem Docker

```bash
# backend
cd backend
npm install
cp ../.env.example .env   # ajuste DATABASE_URL e ANTHROPIC_API_KEY
npm run prisma:migrate    # cria as tabelas
npm run dev                # API em http://localhost:4000
```

```bash
# dashboard (em outro terminal)
cd dashboard
npm install
npm run dev                # painel em http://localhost:3000
```

### Com Docker Compose (stack completa)

```bash
cp .env.example .env
docker compose up --build
```

### Variáveis de ambiente importantes

| Variável | Onde | Para quê |
|---|---|---|
| `DATABASE_URL` | backend | conexão com o Postgres |
| `ANTHROPIC_API_KEY` | backend | necessária a partir da Fase 1 — sem ela, o Agente CEO não roda |
| `NEXT_PUBLIC_API_URL` | dashboard | endereço do backend que o painel consome |

## Testando o Agente CEO manualmente

Com o backend rodando e uma empresa + item de calendário já cadastrados:

```bash
curl -X POST http://localhost:4000/api/calendario/<ID_DO_ITEM>/executar
```

A resposta traz o conteúdo gerado; o progresso pode ser acompanhado ao vivo na Visão Geral do
dashboard (os agentes "se levantam" das mesas conforme trabalham).

## Roteiro completo

O plano de arquitetura e as fases futuras (publicação real, geração de imagem/vídeo, expansão para
múltiplas contas, YouTube, LinkedIn) estão detalhados em `/Users/andrehaas/.claude/plans/elegant-gathering-mist.md`.

## Créditos

Os sprites do escritório em pixel art usam assets **CC0** (domínio público) de [Kenney](https://kenney.nl)
como base para personagens e mobília, além de peças desenhadas especificamente para este projeto.
Licenças originais em `dashboard/public/sprites/LICENSE-kenney-*.txt`.
