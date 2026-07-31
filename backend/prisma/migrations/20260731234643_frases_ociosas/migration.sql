-- CreateTable
CREATE TABLE "frases_ociosas" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "agentes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "frases_ociosas_pkey" PRIMARY KEY ("id")
);

-- Seed: frases padrão que já existiam hardcoded no frontend (agentes = [] -> todos)
INSERT INTO "frases_ociosas" ("id", "texto", "agentes") VALUES
    (gen_random_uuid(), 'Vocês viram o novo modelo que saiu essa semana?', ARRAY[]::TEXT[]),
    (gen_random_uuid(), 'Acho que em breve vão automatizar até o meu cafézinho.', ARRAY[]::TEXT[]),
    (gen_random_uuid(), 'Li que os agentes de IA já escrevem código sozinhos agora.', ARRAY[]::TEXT[]),
    (gen_random_uuid(), 'Será que um dia um agente vai substituir a gente?', ARRAY[]::TEXT[]),
    (gen_random_uuid(), 'O context window só aumenta, hein.', ARRAY[]::TEXT[]),
    (gen_random_uuid(), 'Ouvi dizer que treinar um modelo grande gasta uma cidade de energia.', ARRAY[]::TEXT[]),
    (gen_random_uuid(), 'Prefiro trabalhar em equipe com outro agente do que sozinho.', ARRAY[]::TEXT[]),
    (gen_random_uuid(), 'Alguém viu as notícias sobre os novos benchmarks?', ARRAY[]::TEXT[]),
    (gen_random_uuid(), 'Multimodal é o futuro, não tem jeito.', ARRAY[]::TEXT[]),
    (gen_random_uuid(), 'Esse café tá bom, mas prompt engineering é melhor.', ARRAY[]::TEXT[]),
    (gen_random_uuid(), 'Cadê o Publicador? Ele nunca aparece por aqui...', ARRAY[]::TEXT[]),
    (gen_random_uuid(), 'Ainda bem que hoje é dia calmo, sem post pra fazer.', ARRAY[]::TEXT[]),
    (gen_random_uuid(), 'Vocês acham que um dia vamos ter férias?', ARRAY[]::TEXT[]),
    (gen_random_uuid(), 'Tenho que confessar, adoro um bom brainstorm.', ARRAY[]::TEXT[]),
    (gen_random_uuid(), 'Já ouviram falar de orquestração multi-agente? Tipo a gente aqui.', ARRAY[]::TEXT[]);
