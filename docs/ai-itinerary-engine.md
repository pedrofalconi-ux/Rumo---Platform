# Rumo AI Itinerary Engine — Especificação Técnica de Implementação

> Documento de engenharia alinhado aos PDFs *Arquitetura Técnica - Rumo AI Engine* e *Rumo AI Itinerary Generator*, mapeado para o monorepo `rumo-platform` (Next.js + `@rumo/db` + Supabase migration).

---

## 1. Objetivo

Implementar geração semi-autônoma de roteiros de viagem via LLM, onde:

1. O consultor preenche metadados da viagem em `/trips/new`.
2. Aciona **Gerar roteiro com IA** no editor `/trips/[id]/edit`.
3. O backend orquestra chamadas em etapas e persiste blocos no formato `ItineraryItem[]` já usado pelo editor e pelo app mobile.
4. O consultor revisa, edita e publica.

**Princípio inegociável:** a IA recebe JSON de entrada, retorna JSON validado. Nunca acessa banco, frontend ou estrutura interna da aplicação.

---

## 2. Estado atual do repositório

| Camada | Situação | Arquivo(s) |
|--------|----------|------------|
| Editor de roteiro | Funcional, 15+ tipos de bloco | `apps/web/app/(dashboard)/trips/[id]/edit/page.tsx` |
| Criação de viagem | Coleta origem, destinos, datas, perfil, orçamento, preferências | `apps/web/app/(dashboard)/trips/new/page.tsx` |
| API de viagens | CRUD via JSON local | `apps/web/app/api/trips/**` |
| Modelo de bloco | `ItineraryItem` inline, sem pacote compartilhado | edit page + `packages/db/data/trips.json` |
| Schema Postgres alvo | `itineraries.ai_prompt`, `ai_response`, `content` | `packages/db/migrations/20260624000000_init.sql` |
| Chave Claude | Campo `claudeKey` em settings, sem uso | `packages/db/data/settings.json` |
| Integração LLM | **Inexistente** | — |

**Gap principal:** falta o pacote `packages/ai` e as rotas `/api/ai/*`. O dashboard exibe placeholder "IA Roteirista Ativa" sem backend.

---

## 3. Arquitetura alvo (adaptada ao monorepo)

Os PDFs recomendam NestJS. O projeto atual usa **Next.js Route Handlers** como backend. A camada de IA deve ser um **pacote isolado** consumido pelas rotas — permitindo migração futura para NestJS/BullMQ sem reescrever prompts, schemas ou providers.

```
┌─────────────────────────────────────────────────────────────────┐
│ apps/web (Next.js)                                              │
│  ├─ /trips/new          → coleta TripInput                      │
│  ├─ /trips/[id]/edit    → botão "Gerar com IA" + revisão        │
│  └─ /api/ai/*           → auth + persistência + delegação       │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ packages/ai                                                     │
│  orchestrator/   → pipeline multi-etapa, regras, cache          │
│  prompts/        → templates isolados                           │
│  providers/      → OpenAI, Anthropic, Gemini, DeepSeek          │
│  schemas/        → Zod (entrada/saída)                          │
│  validators/     → pós-processamento + BlockRegistry            │
│  rules/          → Rule Engine (orçamento, perfil, família)     │
│  types/          → contratos compartilhados                     │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
                         LLM Provider (env)
```

**Fluxo de dados:**

```
Trip (JSON) → TripInputSchema → RuleEngine.enrich() → PromptBuilder
    → LLMProvider.generate(prompt, schema) → Zod parse → BlockMapper
    → ItineraryItem[] → db.trips.update() → editor/mobile
```

---

## 4. Mapeamento de blocos (PDF → código existente)

### 4.1 Blocos permitidos no MVP (IA pode gerar)

| Bloco (PDF) | `type` no editor | Gerado no MVP |
|-------------|------------------|---------------|
| Descrição da viagem | `trip_desc` | Sim (etapa 0 — uma vez por viagem) |
| Título, imagem e resumo do dia | `day_summary` | Sim (1 por dia) |
| Lugares | `places` | Sim |
| Tours & Atividades | `activity` | Sim |
| Transporte | `transport` | Sim |
| Texto livre (dicas) | `text` | Sim |
| Suggested places | `suggested_places` | Sim |
| Documentos de viagem | `documents` | Não (V1.1) |
| Preço | `price` | Não (V1.1) |
| Serviços | `services` | Não (V1.1) |
| Cruzeiro | `cruise` | Condicional (só se destino/perfil indicar) |

### 4.2 Blocos proibidos para a IA (PDF + regra de negócio)

| `type` | Motivo |
|--------|--------|
| `flight` | Reserva emitida — integração GDS ou consultor |
| `hotel` | Reserva confirmada — integração TBO/Hotelbeds ou consultor |
| `attachments` | Upload manual |
| `page_break` | Layout PDF, não conteúdo |
| `import_*` | Importação externa |

O **BlockRegistry** deve rejeitar qualquer `type` fora da whitelist antes de persistir.

### 4.3 Formato `ItineraryItem` (contrato de saída)

Alinhado ao editor em `apps/web/app/(dashboard)/trips/[id]/edit/page.tsx`:

```typescript
interface ItineraryItem {
  id: string;           // gerado: `ai-${crypto.randomUUID()}`
  day: number;          // 1..N
  type: BlockType;      // whitelist do registry
  title: string;
  subTitle?: string;
  details?: string;
  image?: string;       // vazio no MVP; enriquecimento via Pixabay em V1.1
  customSymbol?: string; // mapeado de ADD_OPTIONS.defaultSymbol
  meta?: Record<string, unknown>;
}
```

---

## 5. Modelo de entrada (`TripInput`)

Campos já coletados em `/trips/new` e armazenados no trip JSON:

```typescript
interface TripInput {
  tripId: string;
  agencyId: string;
  title: string;
  origin: string;
  destinations: string[];
  destinationsDetail?: Array<{
    city: string;
    startDate: string;  // ISO date YYYY-MM-DD
    endDate: string;
    allTravelers: boolean;
  }>;
  startDate: string;
  endDate: string;
  travelersCount: number;
  travelerNames?: string[];
  clientName: string;
  budget: number;
  currency: 'BRL';
  profile: 'lazer' | 'lua_de_mel' | 'aventura' | 'cultural' | 'negocios';
  preferences: string;  // texto livre: "gastronomia, museus, hotéis boutique"
  locale: 'pt-BR';
}
```

**Normalização obrigatória no orchestrator:**

- Calcular `totalDays` = diff inclusive entre `startDate` e `endDate`.
- Expandir `destinationsDetail` em mapa `day → city` quando multi-destino.
- Converter `travelers: string[]` (iniciais) em `travelersCount`.

---

## 6. Pipeline de geração em etapas

Não gerar a viagem inteira em uma única chamada LLM.

### Etapa 0 — `planTrip` (planejamento macro)

**Entrada:** `TripInput` + regras enriquecidas.

**Saída (`TripPlanSchema`):**

```typescript
interface TripPlan {
  tripDescription: {
    title: string;
    summary: string;
    highlights: string[];
  };
  days: Array<{
    day: number;
    date: string;
    destination: string;
    theme: string;       // ex: "Chegada e centro histórico"
    focus: string[];       // ex: ["gastronomia", "museus"]
  }>;
}
```

### Etapa 1 — `generateDayBlocks` (por dia, paralelizável)

**Entrada:** `TripInput` + um item de `TripPlan.days`.

**Saída (`DayBlocksSchema`):**

```typescript
interface DayBlocks {
  day: number;
  daySummary: {
    title: string;
    subTitle?: string;
    details: string;
  };
  blocks: Array<{
    type: BlockType;
    title: string;
    subTitle?: string;
    details?: string;
    customSymbol?: string;
    meta?: Record<string, unknown>;
  }>;
}
```

**Ordem sugerida de blocos por dia:** `day_summary` → `places`/`activity` → `transport` → `text` (dicas) → `suggested_places`.

### Etapa 2 — `enrichBlocks` (opcional no MVP, obrigatório em V1.1)

Adiciona dicas contextuais, observações de segurança, estimativas textuais de preço (sem bloco `price` numérico).

### Composição final

```typescript
function composeItinerary(plan: TripPlan, days: DayBlocks[]): ItineraryItem[] {
  const items: ItineraryItem[] = [];

  items.push(mapTripDesc(plan.tripDescription)); // day: 1

  for (const day of days) {
    items.push(mapDaySummary(day));
    for (const block of day.blocks) {
      items.push(mapBlock(block, day.day));
    }
  }

  return items;
}
```

---

## 7. Rule Engine

Camada determinística **fora** do LLM. Injeta constraints no prompt; valida saída pós-geração.

**Arquivo:** `packages/ai/rules/travel-rules.ts`

| Regra | Condição | Efeito no prompt / pós-validação |
|-------|----------|----------------------------------|
| Orçamento baixo | `budget < 5000` | Proibir hotéis/luxo; priorizar free walking tours |
| Lua de mel | `profile === 'lua_de_mel'` | Mais jantares românticos, menos museus densos |
| Família | `preferences` contém "criança/família" | Parques, horários curtos, pausas |
| Negócios | `profile === 'negocios'` | Manhãs livres, proximidade a centros |
| Multi-destino | `destinations.length > 1` | Respeitar `destinationsDetail` por intervalo de datas |
| Sem voos/hotéis | sempre | Remover blocos `flight`/`hotel` da resposta |

```typescript
interface RuleContext {
  input: TripInput;
  constraints: string[];   // injetadas no prompt
  blockedTypes: BlockType[];
}

function buildRuleContext(input: TripInput): RuleContext { /* ... */ }
```

---

## 8. Camada LLM — Provider Adapter

**Interface única** (`packages/ai/providers/types.ts`):

```typescript
interface LLMProvider {
  readonly name: string;
  readonly model: string;
  generate<T>(params: {
    system: string;
    user: string;
    schema: ZodSchema<T>;
    temperature?: number;
  }): Promise<{ data: T; usage: TokenUsage; latencyMs: number }>;
}
```

**Implementações MVP:**

| Provider | Env | SDK |
|----------|-----|-----|
| `anthropic` | `ANTHROPIC_API_KEY` ou `settings.claudeKey` | `@anthropic-ai/sdk` |
| `openai` | `OPENAI_API_KEY` | `openai` |

**Seleção via env:**

```env
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-4-20250514
LLM_TEMPERATURE=0.4
LLM_MAX_TOKENS=4096
```

**Structured output:** usar JSON mode / tool use com schema derivado do Zod (`zod-to-json-schema`). Retry até 2x em falha de parse.

---

## 9. Schemas Zod

**Pacote:** `packages/ai/schemas/`

| Arquivo | Schema |
|---------|--------|
| `trip-input.schema.ts` | `TripInputSchema` |
| `trip-plan.schema.ts` | `TripPlanSchema` |
| `day-blocks.schema.ts` | `DayBlocksSchema` |
| `itinerary-item.schema.ts` | `ItineraryItemSchema` |
| `block-type.schema.ts` | `BlockTypeSchema` = enum whitelist |

**BlockType enum MVP:**

```typescript
const AI_BLOCK_TYPES = [
  'trip_desc',
  'day_summary',
  'places',
  'activity',
  'transport',
  'text',
  'suggested_places',
] as const;
```

---

## 10. Prompts isolados

**Diretório:** `packages/ai/prompts/`

| Arquivo | Função |
|---------|--------|
| `system-base.ts` | Persona copiloto de viagens Rumo, idioma pt-BR, JSON only |
| `plan-trip.ts` | Template etapa 0 |
| `generate-day.ts` | Template etapa 1 |
| `enrich-day.ts` | Template etapa 2 (V1.1) |

**Regras de prompt:**

- Listar blocos permitidos explicitamente.
- Proibir inventar PNR, confirmações, preços exatos de passagens.
- Incluir `constraints[]` do Rule Engine.
- Incluir exemplos de 1 dia (few-shot compacto).

---

## 11. API — contratos HTTP

Todas as rotas exigem sessão (`getCurrentUser()`), filtram por `agencyId`.

### 11.1 `POST /api/ai/itinerary/generate`

Dispara pipeline completo para uma viagem existente.

**Request:**

```json
{
  "tripId": "HOR-9921",
  "options": {
    "replaceExisting": true,
    "stages": ["plan", "days", "enrich"]
  }
}
```

**Response 202 (processamento síncrono no MVP):**

```json
{
  "tripId": "HOR-9921",
  "status": "AI_DRAFT",
  "generationId": "gen-uuid",
  "itinerary": [ /* ItineraryItem[] */ ],
  "meta": {
    "model": "claude-sonnet-4-20250514",
    "totalTokens": 8420,
    "latencyMs": 12400,
    "daysGenerated": 7
  }
}
```

**Erros:**

| Status | Código | Condição |
|--------|--------|----------|
| 400 | `INVALID_TRIP_INPUT` | datas/orçamento inválidos |
| 401 | — | não autenticado |
| 404 | `TRIP_NOT_FOUND` | trip inexistente ou outra agência |
| 422 | `LLM_VALIDATION_FAILED` | JSON inválido após retries |
| 503 | `LLM_UNAVAILABLE` | provider down / key ausente |

### 11.2 `POST /api/ai/itinerary/regenerate-day`

Regenera blocos de um único dia preservando os demais.

```json
{
  "tripId": "HOR-9921",
  "day": 3,
  "instruction": "Mais foco em gastronomia local"
}
```

### 11.3 `POST /api/ai/itinerary/regenerate-block`

Regenera um item específico.

```json
{
  "tripId": "HOR-9921",
  "itemId": "ai-abc123",
  "instruction": "Trocar por museu menos conhecido"
}
```

### 11.4 `POST /api/ai/itinerary/approve`

Consultor aprova rascunho IA.

```json
{ "tripId": "HOR-9921" }
```

Transição: `AI_DRAFT` → `AI_REVIEWED`.

---

## 12. Ciclo de vida / status da viagem

### 12.1 Status atuais (web JSON)

`'Publicado' | 'Pendente' | 'Cancelado' | 'Confirmado'`

### 12.2 Extensão proposta

Adicionar campo `aiStatus` separado de `status` comercial:

```typescript
type AiStatus =
  | 'NONE'           // roteiro manual
  | 'AI_GENERATING'  // pipeline em execução
  | 'AI_DRAFT'       // gerado, aguardando revisão
  | 'AI_REVIEWED'    // consultor aprovou conteúdo IA
  | 'AI_FAILED';     // erro na geração

interface Trip {
  // ... campos existentes
  aiStatus?: AiStatus;
  aiGenerationId?: string;
  aiPrompt?: TripInput;      // snapshot enviado
  aiResponse?: AiGenerationMeta;
  aiGeneratedAt?: string;
}
```

**Mapeamento Postgres (futuro Supabase):**

| Campo web | Coluna `itineraries` |
|-----------|----------------------|
| `itinerary` | `content` |
| `aiPrompt` | `ai_prompt` |
| `aiResponse` | `ai_response` |
| `aiStatus` | `metadata.aiStatus` |
| `status: 'Publicado'` | `status: 'confirmed'` |

---

## 13. Persistência e observabilidade

### 13.1 MVP (JSON local)

Estender `packages/db/client.ts`:

```typescript
aiGenerations: {
  create(data: AiGenerationLog): AiGenerationLog;
  findByTripId(tripId: string): AiGenerationLog[];
}
```

**Arquivo:** `packages/db/data/ai-generations.json`

```typescript
interface AiGenerationLog {
  id: string;
  tripId: string;
  agencyId: string;
  userId: string;
  stage: 'plan' | 'day' | 'enrich' | 'full';
  provider: string;
  model: string;
  promptHash: string;       // SHA-256 do prompt (cache key)
  promptSnapshot: object;
  responseSnapshot: object;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  success: boolean;
  error?: string;
  createdAt: string;
}
```

### 13.2 Migration Postgres (fase Supabase)

Adicionar em nova migration:

```sql
CREATE TABLE ai_generations (
  id           UUID PRIMARY KEY DEFAULT gen_ulid(),
  itinerary_id UUID REFERENCES itineraries(id),
  agency_id    UUID REFERENCES agencies(id),
  agent_id     UUID REFERENCES users(id),
  stage        TEXT NOT NULL,
  provider     TEXT NOT NULL,
  model        TEXT NOT NULL,
  prompt_hash  TEXT,
  prompt       JSONB,
  response     JSONB,
  tokens_in    INTEGER,
  tokens_out   INTEGER,
  latency_ms   INTEGER,
  success      BOOLEAN DEFAULT true,
  error        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_generations_prompt_hash ON ai_generations(prompt_hash);
CREATE INDEX idx_ai_generations_itinerary ON ai_generations(itinerary_id);
```

### 13.3 Cache (V1.1)

Antes de chamar LLM, verificar `promptHash` + parâmetros normalizados (destino, dias, perfil, orçamento bucket). Retornar geração anterior se existir e `force !== true`.

---

## 14. Estrutura de pacotes e arquivos a criar

```
packages/
├── ai/
│   ├── package.json
│   ├── tsconfig.json
│   ├── index.ts
│   ├── types/
│   │   ├── trip-input.ts
│   │   ├── itinerary-item.ts
│   │   └── generation.ts
│   ├── schemas/
│   │   ├── block-type.schema.ts
│   │   ├── trip-input.schema.ts
│   │   ├── trip-plan.schema.ts
│   │   ├── day-blocks.schema.ts
│   │   └── itinerary-item.schema.ts
│   ├── prompts/
│   │   ├── system-base.ts
│   │   ├── plan-trip.ts
│   │   └── generate-day.ts
│   ├── rules/
│   │   └── travel-rules.ts
│   ├── validators/
│   │   ├── block-registry.ts
│   │   └── response-validator.ts
│   ├── providers/
│   │   ├── types.ts
│   │   ├── factory.ts
│   │   ├── anthropic.provider.ts
│   │   └── openai.provider.ts
│   ├── orchestrator/
│   │   ├── ai-orchestrator.ts
│   │   ├── compose-itinerary.ts
│   │   └── trip-input-normalizer.ts
│   └── mappers/
│       └── block-to-itinerary-item.ts
│
├── types/                          # (opcional) contratos compartilhados web/mobile/ai
│   └── itinerary.ts

apps/web/app/api/ai/
├── itinerary/
│   ├── generate/route.ts
│   ├── regenerate-day/route.ts
│   ├── regenerate-block/route.ts
│   └── approve/route.ts
```

**Dependências `packages/ai`:**

```json
{
  "dependencies": {
    "zod": "^3.24",
    "zod-to-json-schema": "^3.24",
    "@anthropic-ai/sdk": "^0.39",
    "openai": "^4.77"
  }
}
```

**`apps/web/package.json`:** adicionar `"@rumo/ai": "*"` e `"zod": "^3.24"`.

---

## 15. Integração UI (pontos de alteração)

### 15.1 `/trips/new/page.tsx`

Após criar viagem, opcional checkbox:

```tsx
<label>
  <input type="checkbox" checked={generateWithAi} onChange={...} />
  Gerar roteiro com IA após salvar
</label>
```

Se marcado: `POST /api/trips` → redirect → `POST /api/ai/itinerary/generate` → editor com loading state.

### 15.2 `/trips/[id]/edit/page.tsx`

Adicionar na toolbar:

| Ação | Endpoint | UX |
|------|----------|-----|
| Gerar roteiro com IA | `POST .../generate` | Modal confirma substituição; spinner full-page |
| Regenerar dia | `POST .../regenerate-day` | Botão por seção "Dia N" |
| Regenerar bloco | `POST .../regenerate-block` | Menu contextual no card |
| Aprovar rascunho IA | `POST .../approve` | Badge `AI_DRAFT` → botão "Aprovar conteúdo" |

Banner quando `aiStatus === 'AI_DRAFT'`:

> Rascunho gerado por IA. Revise antes de publicar. Voos e hotéis reservados devem ser adicionados manualmente.

### 15.3 Settings

Validar `claudeKey` ao salvar; endpoint `GET /api/ai/health` testa conectividade sem gerar roteiro.

---

## 16. Segurança e multi-tenancy

1. API key LLM **nunca** exposta ao client — lida server-side via `db.settings` ou env.
2. Toda rota `/api/ai/*` valida `trip.agencyId === user.agencyId`.
3. Rate limit por agência: ex. 10 gerações/hora no MVP (in-memory ou Redis futuro).
4. Sanitizar `preferences` e `instruction` free-text (max 2000 chars, strip HTML).
5. Logs não devem conter PII completa — mascarar e-mail/CPF se presentes no prompt.

---

## 17. Plano de implementação por fases

### Fase 0 — Fundação (1–2 dias)

- [ ] Criar `packages/ai` com types, schemas Zod, BlockRegistry
- [ ] Criar `packages/types/itinerary.ts` e refatorar editor para importar (eliminar duplicação)
- [ ] Adicionar campos `aiStatus`, `aiPrompt`, `aiResponse` ao trip JSON + `client.ts`
- [ ] Configurar env `LLM_PROVIDER`, `LLM_MODEL`

### Fase 1 — Provider + Orchestrator (2–3 dias)

- [ ] Implementar `AnthropicProvider` (prioridade — key já em settings)
- [ ] Implementar `OpenAIProvider`
- [ ] Implementar `AiOrchestrator.generateFullItinerary()`
- [ ] Implementar Rule Engine básico (orçamento + perfil + blocklist)
- [ ] Testes unitários: schemas, registry, compose-itinerary

### Fase 2 — API + persistência (1–2 dias)

- [ ] `POST /api/ai/itinerary/generate`
- [ ] `ai-generations.json` + métodos no `@rumo/db`
- [ ] Normalizer `Trip` web → `TripInput`

### Fase 3 — UI MVP (1–2 dias)

- [ ] Botão "Gerar roteiro com IA" no editor
- [ ] Loading/error states
- [ ] Badge `AI_DRAFT` + botão aprovar
- [ ] Opcional: checkbox em `/trips/new`

### Fase 4 — Regeneração parcial (1 dia)

- [ ] `regenerate-day` e `regenerate-block`
- [ ] Botões no editor por dia/item

### Fase 5 — V1.1

- [ ] Cache por `promptHash`
- [ ] Enriquecimento Pixabay (`/api/media/search`) para imagens em `day_summary`/`places`
- [ ] `GET /api/ai/health`
- [ ] Migration Supabase `ai_generations`
- [ ] Fila assíncrona (BullMQ + Redis) para viagens > 10 dias

### Fase 6 — V2+ (PDF roadmap)

- [ ] RAG com PgVector por destino
- [ ] Integrações Amadeus/TBO/Google Places
- [ ] Multi-agent (planejador, passeios, hospedagem, logística)

---

## 18. Pseudocódigo do Orchestrator

```typescript
// packages/ai/orchestrator/ai-orchestrator.ts

export class AiOrchestrator {
  constructor(
    private provider: LLMProvider,
    private rules: RuleEngine,
    private logger: AiGenerationLogger,
  ) {}

  async generateFullItinerary(input: TripInput): Promise<GenerateResult> {
    const ctx = this.rules.buildContext(input);
    const normalized = normalizeTripInput(input);

    // Etapa 0
    const plan = await this.provider.generate({
      system: SYSTEM_BASE,
      user: buildPlanTripPrompt(normalized, ctx.constraints),
      schema: TripPlanSchema,
    });
    await this.logger.log({ stage: 'plan', ...plan.usage });

    // Etapa 1 — sequencial no MVP; Promise.all em V1.1
    const dayResults: DayBlocks[] = [];
    for (const day of plan.data.days) {
      const dayBlocks = await this.provider.generate({
        system: SYSTEM_BASE,
        user: buildGenerateDayPrompt(normalized, day, ctx.constraints),
        schema: DayBlocksSchema,
      });
      validateBlocks(dayBlocks.data, ctx.blockedTypes);
      dayResults.push(dayBlocks.data);
      await this.logger.log({ stage: 'day', day: day.day, ...dayBlocks.usage });
    }

    const itinerary = composeItinerary(plan.data, dayResults);
    validateItinerary(itinerary);

    return {
      itinerary,
      plan: plan.data,
      meta: aggregateUsage(/* ... */),
    };
  }
}
```

---

## 19. Exemplo de saída esperada (trecho)

Entrada: Roma, 7 dias, casal, lazer, R$ 25.000, preferências gastronomia/museus.

```json
[
  {
    "id": "ai-001",
    "day": 1,
    "type": "trip_desc",
    "title": "Roma Premium — 7 dias de história e gastronomia",
    "details": "Uma semana immersiva no centro histórico..."
  },
  {
    "id": "ai-002",
    "day": 1,
    "type": "day_summary",
    "title": "Chegada em Roma",
    "subTitle": "Centro Storico",
    "details": "Acomodação no centro, passeio leve ao entardecer.",
    "customSymbol": "calendar_today"
  },
  {
    "id": "ai-003",
    "day": 1,
    "type": "transport",
    "title": "Transfer aeroporto → hotel",
    "details": "Taxi oficial ou transfer privado (~45 min FCO).",
    "customSymbol": "directions_car"
  },
  {
    "id": "ai-004",
    "day": 1,
    "type": "places",
    "title": "Piazza Navona",
    "subTitle": "Passeio livre",
    "details": "Ideal para primeiro contato com a cidade.",
    "customSymbol": "museum"
  },
  {
    "id": "ai-005",
    "day": 1,
    "type": "text",
    "title": "Dica local",
    "details": "Evite restaurantes na própria piazza; explore ruas adjacentes."
  }
]
```

---

## 20. Checklist de início imediato

Ordem recomendada para começar a codar **hoje**:

1. **`packages/ai/package.json`** + dependências Zod/Anthropic.
2. **`packages/ai/schemas/block-type.schema.ts`** — enum whitelist.
3. **`packages/ai/validators/block-registry.ts`** — rejeita tipos proibidos.
4. **`packages/ai/providers/anthropic.provider.ts`** — smoke test com schema simples.
5. **`packages/ai/prompts/plan-trip.ts`** + **`generate-day.ts`**.
6. **`packages/ai/orchestrator/ai-orchestrator.ts`** — pipeline completo.
7. **`apps/web/app/api/ai/itinerary/generate/route.ts`** — wiring com auth.
8. **Botão no editor** — chama API e recarrega `itinerary`.

Comando de verificação local (após implementação):

```bash
# terminal 1
npm run dev

# terminal 2 — smoke test
curl -X POST http://localhost:3000/api/ai/itinerary/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: rumo_session=<token>" \
  -d '{"tripId":"HOR-9921","options":{"replaceExisting":true}}'
```

---

## 21. Referências internas

| Recurso | Caminho |
|---------|---------|
| Tipos de bloco (ADD_OPTIONS) | `apps/web/app/(dashboard)/trips/[id]/edit/page.tsx:61-84` |
| Modelo Trip + criação | `apps/web/app/(dashboard)/trips/new/page.tsx` |
| API trips | `apps/web/app/api/trips/` |
| Seed de exemplo | `packages/db/data/trips.json` |
| Schema Postgres | `packages/db/migrations/20260624000000_init.sql:66-88` |
| Settings (API keys) | `packages/db/data/settings.json` |
| Mobile viewer (consome `content`) | `apps/mobile/src/hooks/use-supabase.ts` |

---

## 22. Decisões arquiteturais registradas

| Decisão | Escolha | Alternativa descartada |
|---------|---------|------------------------|
| Backend IA | `packages/ai` + Next API routes | NestJS separado (fase futura) |
| Validação | Zod | JSON Schema puro |
| Provider default | Anthropic (Claude) | OpenAI — suportado via factory |
| Persistência MVP | JSON (`trips.json` + `ai-generations.json`) | Supabase imediato |
| Geração | Multi-step síncrona | Single-shot (PDF proíbe) |
| Status IA | Campo `aiStatus` separado | Sobrescrever `status` comercial |
| Imagens | Vazio no MVP | Pixabay automático (V1.1) |

---

*Versão: 1.0 — 2026-06-24 — Alinhado aos PDFs de arquitetura Rumo e ao estado do monorepo `rumo-platform`.*
