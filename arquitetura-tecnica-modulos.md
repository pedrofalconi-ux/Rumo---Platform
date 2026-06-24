# Arquitetura Técnica e Modularização — Plataforma de Viagens com IA

> Documento de engenharia sênior. Versão 1.0 — MVP + roadmap de escala.

---

## 1. Decisão de Stack

### Por que Next.js + React Native (Expo) é a melhor escolha

A pergunta central é: "devo usar Next.js ou algo diferente?"

A resposta é **Next.js para web + Expo (React Native) para mobile**, compartilhando um monorepo com pacotes de lógica, tipos e componentes em comum. Esse modelo é chamado de **universal app** e é o padrão da indústria para SaaS com presença web + mobile sem dobrar o time.

| Critério | Next.js + Expo | Flutter | SvelteKit + Flutter |
|---|---|---|---|
| Code sharing web/mobile | ✅ (React em ambos) | ❌ (Dart separado) | ❌ (duas linguagens) |
| Ecossistema de libs | ✅ npm gigantesco | Médio | Médio |
| SSR/SEO para landing page | ✅ nativo | ❌ | ✅ |
| Time to market | ✅ rápido | Lento | Médio |
| Supabase SDK | ✅ oficial | ✅ | ✅ |
| Tailwind + shadcn/ui | ✅ | ❌ | ✅ |
| Vercel deploy | ✅ first-class | ❌ | Parcial |

**Conclusão:** Next.js App Router + Expo SDK com monorepo Turborepo.

---

## 2. Stack Completa

### Frontend Web
| Tecnologia | Função |
|---|---|
| Next.js 15 (App Router) | Framework web — SSR, ISR, RSC, API Routes |
| TypeScript 5 | Tipagem estática em todo o projeto |
| Tailwind CSS 4 | Estilização utilitária |
| shadcn/ui | Componentes acessíveis |
| Zustand | State management leve |
| TanStack Query v5 | Server state, cache, prefetch |
| React Hook Form + Zod | Formulários com validação tipada |
| Framer Motion | Animações de UI |

### Mobile
| Tecnologia | Função |
|---|---|
| Expo SDK 52+ | Framework React Native |
| Expo Router | Navegação file-based (mesmo conceito do Next.js) |
| NativeWind | Tailwind para React Native |
| MMKV | Storage offline ultra-rápido |
| Expo Notifications | Push notifications nativas |
| Expo SecureStore | Tokens e credenciais seguros |

### Backend / API
| Tecnologia | Função |
|---|---|
| Next.js Route Handlers | API Routes — BFF para o web |
| tRPC v11 | Type-safe RPC, compartilhado web + mobile |
| Zod | Validação e inferência de schemas |
| Supabase Edge Functions | Funções serverless Deno para webhooks e eventos |
| BullMQ + Redis (Upstash) | Filas de jobs: reservas, emails, notificações |

### Banco de Dados
| Tecnologia | Função |
|---|---|
| Supabase (Postgres) | Banco principal — ACID, relacional |
| Row Level Security (RLS) | Isolamento multi-tenant no nível do banco |
| Supabase Realtime | WebSocket para status de reservas ao vivo |
| Supabase Storage | Upload de documentos, vouchers, fotos |
| Redis (Upstash serverless) | Cache de preços de voos/hotéis (TTL 5-15min) |

### Infra e DevOps
| Tecnologia | Função |
|---|---|
| Vercel | Hospedagem web — Edge Network global |
| Turborepo | Monorepo com build cache inteligente |
| GitHub Actions | CI/CD — test, lint, build, deploy |
| Sentry | Error tracking e performance |
| Datadog / Axiom | APM e logs centralizados |
| Docker Compose | Ambiente local completo |

### Pagamentos
| Tecnologia | Função |
|---|---|
| Stripe | Cartão de crédito/débito internacional |
| Pagar.me | PIX, boleto, cartão nacional |

---

## 3. Arquitetura em Camadas

```
┌─────────────────────────────────────────────────────┐
│                    CLIENTES                          │
│  Web (Next.js)  │  iOS (Expo)  │  Android (Expo)    │
└────────────────────────┬────────────────────────────┘
                         │ HTTPS / WSS
┌────────────────────────▼────────────────────────────┐
│              EDGE LAYER (Vercel)                     │
│  CDN · WAF · Rate Limiting · TLS Termination         │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│           API GATEWAY / BFF                          │
│  Next.js Route Handlers + tRPC                       │
│  Auth Middleware (JWT Supabase) · Logging · Tracing  │
└──┬──────────┬──────────┬──────────┬────────┬────────┘
   │          │          │          │        │
┌──▼──┐  ┌───▼───┐  ┌───▼──┐  ┌───▼──┐  ┌──▼──────┐
│Auth │  │ AI    │  │Search│  │Pay   │  │Notify   │
│Svc  │  │Itiner.│  │&Book │  │ment  │  │Service  │
└──┬──┘  └───┬───┘  └───┬──┘  └───┬──┘  └──┬──────┘
   │          │          │          │        │
   │   ┌──────▼──────────▼──────────▼────────▼──┐
   │   │         MESSAGE QUEUE (BullMQ)          │
   │   │    reserva · email · push · webhook     │
   │   └─────────────────────────────────────────┘
   │
┌──▼──────────────────────────────────────────────────┐
│                 DATA LAYER                           │
│  Supabase Postgres │ Realtime │ Storage │ Redis      │
└─────────────────────────────────────────────────────┘
```

---

## 4. Estrutura do Monorepo

```
/
├── apps/
│   ├── web/                    # Next.js App Router
│   │   ├── app/
│   │   │   ├── (marketing)/    # seudominio.com — landing, planos, SEO
│   │   │   ├── (auth)/         # app.seudominio.com/login e /register
│   │   │   ├── (dashboard)/    # app.seudominio.com — produto (usuários ativos)
│   │   │   │   ├── itineraries/
│   │   │   │   ├── bookings/
│   │   │   │   ├── clients/
│   │   │   │   └── settings/
│   │   │   └── api/            # Route Handlers / BFF
│   │   │       ├── trpc/
│   │   │       ├── webhooks/
│   │   │       └── health/
│   │   └── middleware.ts
│   │
│   └── mobile/                 # Expo (iOS + Android)
│       ├── app/
│       │   ├── (auth)/
│       │   ├── (traveler)/     # App do viajante
│       │   │   ├── itinerary/
│       │   │   ├── documents/
│       │   │   ├── chat/
│       │   │   └── expenses/
│       │   └── (agent)/        # App do consultor mobile
│       └── components/
│
├── packages/
│   ├── api/                    # tRPC router (compartilhado)
│   │   ├── routers/
│   │   │   ├── auth.ts
│   │   │   ├── itinerary.ts
│   │   │   ├── search.ts
│   │   │   ├── booking.ts
│   │   │   ├── payment.ts
│   │   │   └── agency.ts
│   │   └── index.ts
│   │
│   ├── db/                     # Supabase client + schemas
│   │   ├── client.ts
│   │   ├── schema/             # Tipos gerados pelo Supabase CLI
│   │   └── migrations/
│   │
│   ├── ai/                     # Lógica de IA isolada
│   │   ├── itinerary-generator.ts
│   │   ├── prompts/
│   │   └── types.ts
│   │
│   ├── integrations/           # Adaptadores de APIs externas
│   │   ├── tbo-holidays/
│   │   ├── amadeus/
│   │   ├── hotelbeds/
│   │   ├── weather/
│   │   ├── news/
│   │   └── places/
│   │
│   ├── payments/               # Stripe + Pagar.me
│   │   ├── stripe.ts
│   │   └── pagarme.ts
│   │
│   ├── notifications/          # Push + Email + SMS
│   │   ├── push.ts             # Expo Push / OneSignal
│   │   ├── email.ts            # Resend
│   │   └── sms.ts              # Twilio
│   │
│   ├── ui/                     # Design system compartilhado
│   │   ├── components/
│   │   └── tokens/
│   │
│   └── shared/                 # Tipos, utils, constants
│       ├── types/
│       ├── utils/
│       └── constants/
│
├── tooling/
│   ├── eslint/
│   ├── prettier/
│   └── tsconfig/
│
├── turbo.json
├── pnpm-workspace.yaml
└── docker-compose.yml          # Postgres local + Redis local
```

---

## 5. Modelo de Dados — Supabase (Postgres)

### Princípios
- **Multi-tenancy via RLS:** cada linha em quase todas as tabelas tem `agency_id`. As políticas RLS garantem que cada agência só vê seus dados, sem nenhuma lógica de filtro no backend.
- **Soft delete:** todas as entidades usam `deleted_at TIMESTAMPTZ` — nunca `DELETE` físico em produção.
- **Audit trail:** tabelas críticas (bookings, payments) têm triggers que gravam em `audit_logs`.
- **ULID como ID primário:** sortable, UUID-compatible, melhor performance em índices.

### Diagrama de entidades principais

```
agencies (1) ──── (N) users
    │
    ├── (N) clients
    │       └── (N) travelers (passageiros do cliente)
    │
    └── (N) itineraries
              ├── (N) itinerary_days
              │       └── (N) itinerary_activities
              │
              └── (N) bookings
                      ├── (N) booking_flights
                      ├── (N) booking_hotels
                      └── (N) payments
                                └── (N) payment_splits
```

### Tabelas principais

```sql
-- Multi-tenant root
CREATE TABLE agencies (
  id          ULID PRIMARY KEY DEFAULT gen_ulid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  logo_url    TEXT,
  plan        TEXT NOT NULL DEFAULT 'starter', -- starter|pro|business|enterprise
  credits     INTEGER NOT NULL DEFAULT 60,
  settings    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

-- Usuários (consultores + gestores + viajantes)
CREATE TABLE users (
  id          UUID PRIMARY KEY REFERENCES auth.users,
  agency_id   ULID REFERENCES agencies(id),
  role        TEXT NOT NULL, -- agency_admin | agent | traveler
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  avatar_url  TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

-- Clientes da agência (quem compra a viagem)
CREATE TABLE clients (
  id          ULID PRIMARY KEY DEFAULT gen_ulid(),
  agency_id   ULID REFERENCES agencies(id),
  agent_id    UUID REFERENCES users(id),
  full_name   TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  cpf         TEXT,
  passport    TEXT,
  birthdate   DATE,
  preferences JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

-- Roteiros gerados
CREATE TABLE itineraries (
  id           ULID PRIMARY KEY DEFAULT gen_ulid(),
  agency_id    ULID REFERENCES agencies(id),
  agent_id     UUID REFERENCES users(id),
  client_id    ULID REFERENCES clients(id),
  title        TEXT NOT NULL,
  destination  TEXT NOT NULL,
  origin       TEXT NOT NULL,
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  travelers    INTEGER NOT NULL DEFAULT 1,
  budget       NUMERIC(12,2),
  currency     TEXT DEFAULT 'BRL',
  status       TEXT DEFAULT 'draft', -- draft|quoted|confirmed|active|completed|cancelled
  ai_prompt    JSONB,                -- parâmetros enviados à IA
  ai_response  JSONB,                -- resposta bruta da IA para auditoria
  content      JSONB NOT NULL,       -- roteiro estruturado (dias + atividades)
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

-- Reservas (envelope de uma compra)
CREATE TABLE bookings (
  id               ULID PRIMARY KEY DEFAULT gen_ulid(),
  agency_id        ULID REFERENCES agencies(id),
  itinerary_id     ULID REFERENCES itineraries(id),
  client_id        ULID REFERENCES clients(id),
  total_amount     NUMERIC(12,2) NOT NULL,
  currency         TEXT DEFAULT 'BRL',
  status           TEXT DEFAULT 'pending', -- pending|confirmed|cancelled|refunded
  confirmed_at     TIMESTAMPTZ,
  cancelled_at     TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Voos reservados
CREATE TABLE booking_flights (
  id             ULID PRIMARY KEY DEFAULT gen_ulid(),
  booking_id     ULID REFERENCES bookings(id),
  supplier       TEXT NOT NULL, -- tbo|amadeus|duffel
  supplier_ref   TEXT NOT NULL, -- PNR ou booking ref do fornecedor
  origin         TEXT NOT NULL,
  destination    TEXT NOT NULL,
  departure_at   TIMESTAMPTZ NOT NULL,
  arrival_at     TIMESTAMPTZ NOT NULL,
  airline        TEXT,
  flight_number  TEXT,
  class          TEXT,
  amount         NUMERIC(12,2) NOT NULL,
  status         TEXT DEFAULT 'confirmed', -- confirmed|cancelled|changed
  raw_response   JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Hospedagens reservadas
CREATE TABLE booking_hotels (
  id             ULID PRIMARY KEY DEFAULT gen_ulid(),
  booking_id     ULID REFERENCES bookings(id),
  supplier       TEXT NOT NULL,
  supplier_ref   TEXT NOT NULL,
  hotel_name     TEXT NOT NULL,
  destination    TEXT NOT NULL,
  checkin_date   DATE NOT NULL,
  checkout_date  DATE NOT NULL,
  room_type      TEXT,
  board_type     TEXT, -- breakfast|half|full|ai
  guests         INTEGER NOT NULL DEFAULT 1,
  amount         NUMERIC(12,2) NOT NULL,
  status         TEXT DEFAULT 'confirmed',
  raw_response   JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Pagamentos
CREATE TABLE payments (
  id               ULID PRIMARY KEY DEFAULT gen_ulid(),
  booking_id       ULID REFERENCES bookings(id),
  agency_id        ULID REFERENCES agencies(id),
  amount           NUMERIC(12,2) NOT NULL,
  currency         TEXT DEFAULT 'BRL',
  method           TEXT NOT NULL, -- credit_card|pix|boleto
  provider         TEXT NOT NULL, -- stripe|pagarme
  provider_ref     TEXT,          -- ID do charge no provider
  status           TEXT DEFAULT 'pending', -- pending|paid|failed|refunded
  installments     INTEGER DEFAULT 1,
  paid_at          TIMESTAMPTZ,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Splits de comissão
CREATE TABLE payment_splits (
  id          ULID PRIMARY KEY DEFAULT gen_ulid(),
  payment_id  ULID REFERENCES payments(id),
  recipient   TEXT NOT NULL, -- agency|agent|platform
  user_id     UUID REFERENCES users(id),
  amount      NUMERIC(12,2) NOT NULL,
  percentage  NUMERIC(5,2),
  status      TEXT DEFAULT 'pending',
  settled_at  TIMESTAMPTZ
);
```

### RLS (Row Level Security)

```sql
-- Exemplo: consultores só veem itinerários da própria agência
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_isolation" ON itineraries
  USING (agency_id = (
    SELECT agency_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "agent_own" ON itineraries
  FOR ALL USING (
    agent_id = auth.uid()
    OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'agency_admin'
  );
```

---

## 6. Princípios de Engenharia de Software Aplicados

### 6.1 SOLID
- **Single Responsibility:** cada `package/` tem uma única responsabilidade (ai, payments, notifications, integrations)
- **Open/Closed:** os adaptadores de fornecedores (TBO, Amadeus) implementam uma interface `FlightSearchProvider` — adicionar um novo fornecedor não altera código existente
- **Liskov Substitution:** `TBOHolidaysAdapter` e `AmadeusAdapter` são intercambiáveis onde se espera `FlightSearchProvider`
- **Interface Segregation:** `IFlightSearch`, `IHotelSearch`, `IBookingConfirm` separadas — um fornecedor só implementa o que oferece
- **Dependency Inversion:** os serviços recebem providers via injeção, não instanciam diretamente

```typescript
// packages/integrations/types.ts
export interface FlightSearchProvider {
  search(params: FlightSearchParams): Promise<FlightOffer[]>
  book(offer: FlightOffer, travelers: Traveler[]): Promise<FlightBookingResult>
  cancel(bookingRef: string): Promise<void>
}

// packages/integrations/tbo-holidays/index.ts
export class TBOHolidaysAdapter implements FlightSearchProvider { ... }

// packages/integrations/amadeus/index.ts
export class AmadeusAdapter implements FlightSearchProvider { ... }
```

### 6.2 Domain-Driven Design (DDD) — simplificado
Bounded contexts do projeto:
- **Identity & Access** → auth, permissões, planos
- **Itinerary** → criação, edição, publicação de roteiros
- **Inventory** → busca de voos e hotéis (antiCorruption Layer sobre APIs externas)
- **Booking** → reservas, confirmações, cancelamentos
- **Payment** → cobranças, splits, reembolsos
- **Notification** → push, email, SMS
- **Agency Management** → consultores, clientes, relatórios

### 6.3 Hexagonal Architecture (Ports & Adapters)
Cada serviço é independente de infra. A lógica de negócio nunca importa diretamente o SDK do Stripe ou da TBO — importa uma interface. O adaptador é injetado.

```
[Core domain logic]
      │
   [Port interface]
      │
   [Adapter] ←→ [External system (Stripe, TBO, etc.)]
```

### 6.4 CQRS + Event Sourcing (parcial)
- Operações de leitura (search, list) usem cache Redis com TTL
- Operações de escrita (booking, payment) disparam eventos em fila (BullMQ)
- Eventos são persistidos em `audit_logs` — estado reconstituível

### 6.5 Cache Strategy (stale-while-revalidate)
```
Voos buscados → cache Redis TTL 5min
Hotéis buscados → cache Redis TTL 10min
Detalhes de POI (Google Places) → cache Redis TTL 24h
Previsão do tempo → cache Redis TTL 1h
Notícias do destino → cache Redis TTL 30min
```

### 6.6 Retry + Circuit Breaker
Todas as chamadas a APIs externas (TBO, Amadeus, Stripe) são envolvidas por:
- **Retry exponencial:** 3 tentativas com backoff 1s / 2s / 4s
- **Circuit Breaker:** após 5 falhas consecutivas, o circuit abre por 30s
- **Timeout global:** 10s por chamada externa

Biblioteca sugerida: `cockatiel` (Node.js) ou implementação manual com BullMQ.

---

## 7. Segurança

| Camada | Medida |
|---|---|
| Autenticação | Supabase Auth (JWT) + refresh token rotation |
| Autorização | RLS no Postgres + middleware no BFF |
| Multi-tenancy | `agency_id` em todas as tabelas + política RLS |
| Secrets | Vercel Environment Variables (nunca no repositório) |
| APIs externas | Chaves rotacionadas a cada 90 dias, armazenadas no Vault |
| Rate limiting | Vercel Edge Config ou middleware customizado (50 req/min por IP) |
| Inputs | Zod validation em 100% dos inputs de API |
| Pagamentos | PCI-DSS delegado ao Stripe/Pagar.me (nunca armazenar dados de cartão) |
| LGPD | Soft delete, exportação de dados do titular, consent tracking |

---

## 8. Observabilidade

```
Logs estruturados (JSON) → Axiom / Datadog
Traces distribuídos → OpenTelemetry → Datadog APM
Erros de runtime → Sentry
Alertas → PagerDuty / Slack webhook
Métricas de negócio → PostHog (product analytics)
Uptime → Better Uptime / Vercel Analytics
```

---

## 9. Modularização do Desenvolvimento (Sprints)

---

### MÓDULO 0 — Fundação (2 semanas)

**Objetivo:** Monorepo configurado, CI/CD, autenticação e banco de dados funcionando.

**Tarefas:**
- [ ] Criar monorepo com Turborepo + pnpm workspaces
- [ ] Configurar `apps/web` (Next.js 15)
- [ ] Configurar `apps/mobile` (Expo SDK)
- [ ] Configurar `packages/db` com Supabase client e tipos gerados
- [ ] Criar migrations iniciais: `agencies`, `users`, `clients`
- [ ] Configurar RLS básico
- [ ] Implementar autenticação: login/registro com Supabase Auth
- [ ] Configurar GitHub Actions: lint + typecheck + deploy automático para Vercel
- [ ] Configurar Sentry e variáveis de ambiente
- [ ] Docker Compose local: Postgres + Redis

**Entregável:** Ambiente de desenvolvimento pronto, login funcionando, deploy automático na Vercel.

---

### MÓDULO 1 — Landing Page e Marketing (1 semana)

**Objetivo:** Landing page pública focada em conversão, marketing e SEO, servida no domínio raiz. O produto fica isolado no subdomínio `app.`, passando uma imagem mais profissional e mantendo os dois contextos desacoplados.

**Estratégia de domínio:**

| URL | Conteúdo | Route group Next.js |
|---|---|---|
| `seudominio.com` | Landing page, blog, planos, FAQ | `app/(marketing)/` |
| `app.seudominio.com` | Dashboard do consultor e da agência | `app/(dashboard)/` |

Na Vercel, o subdomínio `app.` é configurado como um rewrite ou como um segundo projeto apontando para o mesmo repositório — a separação é de roteamento, não necessariamente de código. O middleware do Next.js detecta o hostname e redireciona para o grupo correto.

**Tarefas:**
- [ ] Configurar Vercel: domínio raiz → `(marketing)`, `app.` → `(dashboard)`
- [ ] Middleware de hostname routing (`middleware.ts`)
- [ ] Seção Hero com headline e CTAs
- [ ] Seção "Como funciona" (3 passos)
- [ ] Seção de features com cards (diferenciais vs concorrentes)
- [ ] Seção "Para quem é" (agência / consultor / viajante)
- [ ] Tabela de planos e preços com toggle mensal/anual
- [ ] FAQ accordion
- [ ] Formulário de captura de email (Resend ou Loops)
- [ ] Páginas de login e registro (acessíveis via `app.seudominio.com/login`)
- [ ] SEO: metadata, OpenGraph, sitemap, robots.txt
- [ ] Google Analytics / PostHog

**Entregável:** Landing page no ar em `seudominio.com`, acesso ao produto via `app.seudominio.com`.

---

### MÓDULO 2 — Estrutura Base do Dashboard (1 semana)

**Objetivo:** Shell do painel (layout, navegação, perfis de usuário).

**Tarefas:**
- [ ] Layout do dashboard (sidebar + topbar + área de conteúdo)
- [ ] Navegação por papel: `agency_admin` vs `agent`
- [ ] Página de perfil e configurações de conta
- [ ] Configurações da agência (logo, nome, plano)
- [ ] Gestão de usuários/consultores pela agência
- [ ] Convite de novos consultores por email
- [ ] Gestão de clientes (CRUD)

**Entregável:** Dashboard navegável com gestão básica de usuários e clientes.

---

### MÓDULO 3 — IA de Roteiro (2 semanas)

**Objetivo:** Geração de roteiros personalizados via Claude API.

**Tarefas:**
- [ ] Formulário de criação de roteiro (destino, datas, viajantes, perfil, orçamento, preferências)
- [ ] Prompt engineering para geração de roteiro estruturado (JSON com dias e atividades)
- [ ] Stream da resposta da IA para o front (feedback em tempo real enquanto gera)
- [ ] Salvar roteiro gerado no banco (`itineraries` + `itinerary_days` + `itinerary_activities`)
- [ ] Editor de roteiro (drag-and-drop de atividades entre dias, edição inline)
- [ ] Visualização do roteiro em linha do tempo / card view
- [ ] Exportação do roteiro em PDF (via `react-pdf`)
- [ ] Integração com Weather API (exibir previsão por dia do roteiro)
- [ ] Integração com NewsAPI (exibir alertas do destino)
- [ ] Integração com Google Places (enriquecer atividades com fotos e avaliações)

**Entregável:** Consultor consegue gerar, editar e exportar um roteiro completo.

---

### MÓDULO 4 — Busca de Voos (2 semanas)

**Objetivo:** Buscar voos via API de consolidadoras e adicioná-los ao pacote.

**Tarefas:**
- [ ] Criar `FlightSearchProvider` interface
- [ ] Implementar `TBOHolidaysAdapter`
- [ ] Implementar `AmadeusAdapter` (fallback)
- [ ] Cache Redis para resultados de busca (TTL 5min)
- [ ] Formulário de busca (origem, destino, datas, passageiros, classe)
- [ ] Listagem de voos com filtros (companhia, escalas, preço, horário)
- [ ] Detalhe do voo (bagagem, política de cancelamento)
- [ ] Adição do voo selecionado ao pacote do roteiro
- [ ] Tratamento de erros e indisponibilidade (circuit breaker)

**Entregável:** Consultor busca e seleciona voos dentro da plataforma.

---

### MÓDULO 5 — Busca de Hotéis (2 semanas)

**Objetivo:** Buscar hospedagens e adicioná-las ao pacote.

**Tarefas:**
- [ ] Criar `HotelSearchProvider` interface
- [ ] Implementar `TBOHolidaysAdapter` (hotéis)
- [ ] Implementar `HotelbedsAdapter` (fallback)
- [ ] Cache Redis para resultados (TTL 10min)
- [ ] Formulário de busca (destino, datas, hóspedes, tipo de quarto)
- [ ] Listagem com filtros (estrelas, preço, localização, café da manhã)
- [ ] Galeria de fotos, mapa de localização, avaliações
- [ ] Adição da hospedagem ao pacote
- [ ] Tratamento de disponibilidade (verificar antes de confirmar)

**Entregável:** Consultor busca e seleciona hotéis dentro da plataforma.

---

### MÓDULO 6 — Pacote e Checkout (1 semana)

**Objetivo:** Consolidar voos + hotéis em um pacote e preparar para pagamento.

**Tarefas:**
- [ ] Carrinho de viagem (lista de itens selecionados)
- [ ] Resumo do pacote com totais em tempo real
- [ ] Simulador de parcelamento
- [ ] Revisão de políticas de cancelamento por item
- [ ] Geração do `booking` no banco
- [ ] Envio do link de pagamento para o cliente

**Entregável:** Pacote de viagem criado e pronto para pagamento.

---

### MÓDULO 7 — Pagamento Centralizado (2 semanas)

**Objetivo:** Processar pagamentos sem redirecionar para fora da plataforma.

**Tarefas:**
- [ ] Integração Stripe (cartão de crédito/débito)
- [ ] Integração Pagar.me (PIX, boleto, cartão nacional)
- [ ] Webhook de confirmação de pagamento → atualizar status do booking
- [ ] Split automático agência/consultor
- [ ] Emissão de recibo por email (Resend)
- [ ] Página de confirmação de pagamento para o cliente
- [ ] Fluxo de reembolso (cancelamento dentro da política)
- [ ] Painel financeiro básico: receitas, repasses, saldo pendente

**Entregável:** Cliente paga dentro do app, agência e consultor recebem automaticamente.

---

### MÓDULO 8 — App do Viajante (2 semanas)

**Objetivo:** App mobile para o viajante acompanhar sua viagem.

**Tarefas:**
- [ ] Publicar roteiro para o viajante (app mobile Expo)
- [ ] Visualização do roteiro dia a dia (offline-first com MMKV)
- [ ] Download offline de vouchers e documentos
- [ ] Alertas de voo em tempo real (polling ou webhook da companhia)
- [ ] Notificações push contextuais (check-in, lembrete de passeio, clima)
- [ ] Chat entre viajante e consultor (Supabase Realtime)
- [ ] Guias do destino (Google Places offline)
- [ ] Clima atual e previsão dos próximos dias
- [ ] Gestor de despesas pessoais (CRUD local + sync)
- [ ] Diário de viagem (fotos + anotações → Supabase Storage)

**Entregável:** Viajante acompanha toda a viagem pelo app mobile.

---

### MÓDULO 9 — Painel da Agência (1 semana)

**Objetivo:** Visibilidade operacional e financeira para o gestor da agência.

**Tarefas:**
- [ ] Dashboard com KPIs (viagens ativas, receita do mês, ticket médio)
- [ ] Listagem de todas as viagens com status em tempo real
- [ ] Status granular por item (voo confirmado, hotel pendente, pagamento parcial)
- [ ] Relatório de desempenho por consultor
- [ ] Exportação de relatórios (PDF, CSV, Excel)
- [ ] Alertas automáticos de itens críticos (voo em 24h sem check-in)
- [ ] Gestão de créditos e plano de assinatura

**Entregável:** Gestor da agência tem visibilidade completa de toda a operação.

---

### MÓDULO 10 — Polimento, Testes e Launch (2 semanas)

**Objetivo:** Qualidade, performance e lançamento público.

**Tarefas:**
- [ ] Testes unitários críticos (payment service, booking service, AI prompts)
- [ ] Testes E2E (Playwright): fluxo de criação de roteiro + booking + pagamento
- [ ] Lighthouse ≥ 90 em todas as páginas públicas
- [ ] Auditoria de segurança (OWASP Top 10)
- [ ] Política de privacidade + LGPD (consentimento, exportação de dados)
- [ ] Onboarding in-app para novos consultores
- [ ] Publicação do app no App Store e Google Play
- [ ] Campanha de lançamento (beta fechado → público)

**Entregável:** Produto no ar, apps publicados, primeiras agências onboard.

---

## 10. Estimativa de Timeline Total

| Módulo | Duração | Acumulado |
|---|---|---|
| 0 — Fundação | 2 semanas | 2 sem |
| 1 — Landing Page | 1 semana | 3 sem |
| 2 — Dashboard base | 1 semana | 4 sem |
| 3 — IA de Roteiro | 2 semanas | 6 sem |
| 4 — Busca de Voos | 2 semanas | 8 sem |
| 5 — Busca de Hotéis | 2 semanas | 10 sem |
| 6 — Pacote e Checkout | 1 semana | 11 sem |
| 7 — Pagamento | 2 semanas | 13 sem |
| 8 — App do Viajante | 2 semanas | 15 sem |
| 9 — Painel da Agência | 1 semana | 16 sem |
| 10 — Polimento e Launch | 2 semanas | **18 semanas (~4,5 meses)** |

> Time solo ou duo: adicionar 30-40% de buffer. Time de 3-4 devs: timeline acima é realista.

---

## 11. Comandos para Iniciar o Projeto

```bash
# 1. Criar o monorepo
npx create-turbo@latest viagem-ai --package-manager pnpm

# 2. Adicionar apps
cd viagem-ai
npx create-next-app@latest apps/web --typescript --tailwind --app
npx create-expo-app@latest apps/mobile --template expo-router

# 3. Instalar dependências principais
pnpm add -D typescript @types/node
pnpm add @supabase/supabase-js @trpc/server @trpc/client zod
pnpm add zustand @tanstack/react-query
pnpm add stripe @stripe/stripe-js

# 4. Configurar Supabase
npx supabase init
npx supabase db push

# 5. Rodar em desenvolvimento
pnpm dev
```

---

*Documento técnico gerado em junho/2026. Revisar a cada sprint e atualizar versões de dependências antes de iniciar cada módulo.*
