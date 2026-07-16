# Proxima Etapa: Reduzir Alucinacao de POIs e Restaurantes com RAG

## Status de Implementacao (16/07/2026)

Primeiro incremento concluido:

- migration segura de `destination_pois`, com RLS e acesso apenas pelo backend
- contrato `PoiRetriever` independente de banco dentro de `packages/ai`
- recuperacao server-side via Supabase antes de cada geracao/regeneracao de dia
- ranking simples por cidade, tema, foco, perfil e tags
- contexto de prompt com whitelist de POIs curados
- fallback explicito sem nomes comerciais quando nao existe cobertura
- sanitizacao dos campos antes da injecao no prompt
- testes dos caminhos coberto, descoberto e conteudo malicioso

Pendente para colocar em producao:

- aplicar a migration no Supabase de desenvolvimento (aguardando credencial de DDL local)
- popular Roma, Paris e Orlando por cargas sequenciais da Overpass API/OpenStreetMap
- criar e revisar o primeiro seed factual
- executar uma avaliacao comparativa com roteiros reais

Decisoes confirmadas:

- ambientes na ordem desenvolvimento, staging e producao
- cidades iniciais: Roma, Paris e Orlando
- OpenStreetMap/Overpass como fonte primaria gratuita, com validacao em sites oficiais quando possivel
- importacoes sao offline, sequenciais e armazenadas com atribuicao e proveniencia ODbL
- `manual_overrides`, `partner` e `featured_rank` formam a camada de curadoria editorial propria

Fluxo de importacao:

- `node scripts/import-overpass-pois.mjs --city=roma` baixa um JSON para revisao
- adicionar `--apply` envia os registros inativos ao Supabase
- adicionar `--activate` ativa diretamente; evitar antes de revisar qualidade e duplicatas
- repetir de forma sequencial para `paris` e `orlando`, nunca em paralelo nas instancias publicas

Aplicacao manual pelo Dashboard:

- abrir o SQL Editor do projeto de desenvolvimento
- executar `scripts/sql/supabase-create-destination-pois.sql`
- confirmar no resultado: RLS ativo, `anon_select=false`, `authenticated_select=false` e `service_role_select=true`

## Objetivo

Esta etapa existe para resolver o proximo gargalo do motor de IA do Rumo: a geracao de restaurantes, cafes, bares e pontos de interesse ficticios ou pouco confiaveis.

Depois da camada de resiliencia ja implementada, o fluxo ficou mais tolerante a JSON parcial e dados incompletos. O proximo passo e melhorar a confiabilidade factual do conteudo gerado.

Meta pratica:

- reduzir drasticamente nomes inventados de restaurantes e POIs
- priorizar lugares reais, curados e reutilizaveis por destino
- permitir que a IA gere roteiros bons mesmo quando nao tiver “memoria perfeita” do destino
- manter fallback seguro quando o destino ainda nao tiver base curada

## Problema Atual

Hoje o orquestrador gera o roteiro principalmente a partir do prompt e da memoria paramatrica do modelo. Isso cria alguns efeitos previsiveis:

- nomes plausiveis, mas inexistentes, para restaurantes e atracoes
- enderecos aproximados demais ou inconsistentes
- sugestoes que nao respeitam bem regiao, perfil ou funcionamento real
- perda de confianca do consultor, que precisa revisar quase tudo manualmente

Prompt engineering ajuda, mas nao resolve sozinho. A origem do problema e falta de grounding em dados reais.

## Direcao Tecnica

Atacar o problema com uma arquitetura RAG por destino.

Ideia central:

1. manter uma base curada de POIs reais por cidade
2. recuperar os candidatos mais relevantes antes da geracao do dia
3. injetar esse contexto no prompt
4. instruir a IA a usar prioritariamente apenas os itens recuperados
5. quando nao houver base suficiente, permitir lugares reais de alta confianca e marca-los como pendentes de verificacao

## Escopo do MVP

Para nao explodir a complexidade, o MVP deve ser restrito.

Sugestao:

- suportar primeiro 3 a 5 cidades prioritarias
- cobrir apenas tipos mais criticos:
  - restaurantes
  - cafes
  - atracoes
  - mirantes
  - parques
  - mercados
- manter ingestao semantica simples, sem pipeline pesado de automacao logo de inicio

Destinos candidatos do MVP:

- Roma
- Paris
- Orlando
- Miami
- Joao Pessoa

## Arquitetura Proposta

### 1. Base de dados de POIs

Criar uma tabela no Supabase para armazenar pontos curados por destino.

Sugestao inicial de schema:

```sql
create table public.destination_pois (
  id uuid primary key default gen_random_uuid(),
  destination_city text not null,
  destination_country text,
  name text not null,
  type text not null,
  sub_type text,
  description text,
  neighborhood text,
  address text,
  latitude double precision,
  longitude double precision,
  price_range text,
  tags text[] default '{}',
  source text,
  source_ref text,
  curated boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Campos importantes:

- `destination_city`: chave principal de filtro no MVP
- `type` e `sub_type`: ajudam a buscar restaurante, museu, cafe etc
- `tags`: ajudam a cruzar perfil e intencao
- `curated` e `active`: permitem controle manual
- `source` e `source_ref`: ajudam auditoria e revisao

### 2. Busca antes da geracao

Antes de gerar um dia:

1. identificar cidade do dia
2. extrair contexto leve do plano:
   - tema do dia
   - foco
   - perfil da viagem
   - faixa de orcamento
3. buscar POIs compatíveis
4. montar bloco de contexto para o prompt

Primeira versao da busca pode ser hibrida, sem embedding obrigatorio:

- filtro por `destination_city`
- filtro por `type`
- ordenacao simples por aderencia a `tags`
- limite de 10 a 20 itens por dia

Embeddings e busca vetorial entram na fase 2.

### 3. Injeção de contexto no prompt

Adicionar ao `buildGenerateDayPrompt` um bloco como:

```md
POIs reais validados para este destino:
- [restaurant] Roscioli | Centro Historico | massas romanas | faixa $$$
- [attraction] Pantheon | Centro Historico | visita essencial
- [cafe] Sant'Eustachio Il Caffe | Centro Historico | cafe tradicional
```

E reforcar a regra:

- use prioritariamente os itens desta lista quando citar nomes proprios
- se nenhum item servir para o contexto, use descricao generica qualificada
- fora da base, use apenas nomes de alta confianca e marque `verificationRequired=true`

### 4. Fallback seguro

Se nao houver POIs suficientes para um destino:

- continuar gerando o dia
- nao bloquear a IA
- permitir nomes proprios de alta confianca, sinalizando que ainda nao foram validados pela base Rumo
- preferir titulos como:
  - `Almoco em trattoria local no Trastevere`
  - `Caminhada por area historica proxima ao hotel`

Isso mantem o roteiro util sem forcar invencao.

## Integracoes Recomendadas

### Fase 1

Curadoria manual ou semi-manual:

- seed SQL
- CSV importado
- painel interno simples no futuro

### Fase 2

Fontes automatizadas:

- OpenStreetMap via Overpass API para cargas iniciais e incrementais controladas
- TripAdvisor
- base propria da agencia

### Fase 3

Busca vetorial:

- `pgvector`
- embeddings de descricao, tags e bairro
- ranking semantico por perfil e intencao do dia

## Mudancas de Codigo Esperadas

### Backend / AI

Arquivos mais provaveis de mudanca:

- `packages/ai/prompts/index.ts`
- `packages/ai/orchestrator/ai-orchestrator.ts`
- `apps/web/lib/ai/create-orchestrator.ts`

Novos modulos sugeridos:

- `packages/ai/rag/poi-retriever.ts`
- `packages/ai/rag/poi-prompt-context.ts`
- `apps/web/lib/server-poi-store.ts`

### Banco / SQL

Novos arquivos sugeridos:

- `scripts/sql/supabase-create-destination-pois.sql`
- `scripts/sql/supabase-seed-destination-pois-mvp.sql`

## Fases de Implementacao

### Fase 1: Base Curada e Prompt Grounded

Objetivo:

- criar tabela
- popular 3 a 5 destinos
- consultar POIs por cidade/tipo
- injetar no prompt

Resultado esperado:

- queda grande de restaurantes inventados
- ganho de consistencia em dias centrais do roteiro

### Fase 2: Regras de Selecao e Guardrails

Objetivo:

- definir whitelist de destinos suportados
- mostrar aviso quando destino nao tiver base confiavel
- identificar nomes proprios fora da base com `poiValidation=model_knowledge`

Resultado esperado:

- previsibilidade melhor para consultor
- menos surpresa ruim em destinos sem cobertura

### Fase 3: Embeddings e Busca Semantica

Objetivo:

- enriquecer recuperacao por perfil, tema e estilo do dia
- melhorar ordenacao dos candidatos

Resultado esperado:

- sugestoes mais aderentes sem precisar ampliar demais o prompt

### Fase 4: Fotos e Validacao de Existencia

Objetivo:

- aproveitar `place_id`, fotos e coordenadas reais
- usar mesma base para enriquecer imagem e localizacao

Resultado esperado:

- menos alucinacao e mais consistencia visual/logistica

## Riscos

- base pequena demais pode engessar a geracao
- base grande e mal curada pode piorar a confiabilidade
- prompt com contexto demais pode inflar tokens sem melhorar qualidade
- automacao com fontes externas sem revisao pode trazer POIs fechados ou fracos

## Criterios de Pronto do MVP

- existe tabela de POIs curados no Supabase
- existem seeds de ao menos 3 destinos prioritarios
- o gerador de dia consulta essa base antes do prompt
- o prompt recebe POIs reais do destino
- quando nao houver cobertura, a IA cai para descricao generica qualificada
- testes cobrem:
  - destino com base curada
  - destino sem base curada
  - restaurante especifico fora da base

## Ordem Recomendada de Trabalho

1. criar schema SQL da base de POIs
2. montar seed manual de destinos MVP
3. criar store server-side para busca por cidade/tipo
4. injetar contexto no prompt diario
5. adicionar fallback com lugares reais e verificacao obrigatoria fora da base
6. medir qualidade com 5 a 10 viagens reais de teste

## Decisao Recomendada

Comecar sem embedding.

O melhor custo-beneficio imediato e:

- tabela curada
- retrieval simples por cidade/tipo/tags
- prompt grounded
- fallback seguro

Isso resolve a maior parte do problema com baixa complexidade e prepara o terreno para busca vetorial depois.
