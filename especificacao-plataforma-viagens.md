# Especificação do Produto — Plataforma de Viagens com IA

> Documento de referência para desenvolvimento da plataforma. Versão 1.0.

---

## 1. Contexto e Oportunidade de Mercado

### 1.1 Análise do Concorrente Principal: Meu Agente (meuagente.com)

O Meu Agente é uma plataforma SaaS B2B voltada para agências de viagens, com foco em **entrega de experiência ao viajante**. Operando desde 2017, possui premiações internacionais (Apple Top 10, PhoCusWright, Webby Awards) e atende 451+ agências no Brasil e outros países.

**O que eles oferecem hoje:**

| Funcionalidade | Start | Pro | Elite |
|---|---|---|---|
| App co-branded com marca da agência | ✅ | ✅ | ✅ |
| Itinerários digitais personalizados | ✅ | ✅ | ✅ |
| Vouchers e documentos anexos | ✅ | ✅ | ✅ |
| Chat em grupo com viajantes | ✅ | ✅ | ✅ |
| Guias e mapas offline (1.950+ destinos) | ✅ | ✅ | ✅ |
| Importação automática de reservas (IA) | ✅ | ✅ | ✅ |
| Realidade aumentada | ✅ | ✅ | ✅ |
| Alertas de voo em tempo real | ❌ | ✅ | ✅ |
| Notificações contextuais automáticas | ❌ | ✅ | ✅ |
| Botão de contato customizável | ❌ | ✅ | ✅ |
| Tour Leader para grupos | ❌ | ✅ | ✅ |
| Gestor de despesas do viajante | ❌ | ✅ | ✅ |
| Diário de viagem | ❌ | ✅ | ✅ |
| Assistente Virtual IA para viajante | ❌ | ❌ | ✅ |
| Subcontas de agência | ❌ | ❌ | ✅ |
| Localizar cliente via GPS | ❌ | ❌ | ✅ |
| Importar viagem via GDS (Amadeus/Sabre) | ❌ | ❌ | ✅ |
| Integrações via API | ❌ | ❌ | ✅ |

**Preços (referência):**
- Start: R$ 97/mês (60 créditos/ano, 2 usuários)
- Pro: R$ 197/mês (180 créditos/ano, 5 usuários)
- Elite: R$ 397/mês (360 créditos/ano, 10 usuários)

**Modelo de créditos:** 1 crédito = 1 passageiro por viagem publicada.

**Limitações identificadas no Meu Agente (nossa oportunidade):**
- Não realiza busca nem reserva de passagens/hospedagens — o agente ainda precisa ir a outros sistemas (operadoras, GDS, OTAs) para comprar
- Não integra pagamento: a compra acontece fora da plataforma
- Não gera roteiro com IA do zero — importa PDFs existentes, não cria a partir do zero com base em preferências
- Não consulta clima, notícias ou eventos no destino para otimizar o roteiro
- Não tem painel de gestão operacional para a agência (controle do que foi ou não realizado na viagem)
- Modelo focado em B2B (agência), sem opção de uso direto pelo viajante final

---

## 2. Nossa Proposta de Valor

Nossa plataforma vai além da entrega de itinerários: ela é um **ecossistema completo de viagem**, onde o roteiro é montado por IA, as passagens e hospedagens são pesquisadas e compradas dentro do próprio app, e tanto o consultor quanto a agência têm visibilidade total do que foi executado.

**Slogan sugerido:** *"Do roteiro ao embarque, tudo em um lugar."*

**Diferenciais competitivos em relação ao Meu Agente:**

1. IA que **cria roteiros do zero** com base em preferências, datas, orçamento e perfil do viajante
2. **Busca e compra integrada** de passagens e hospedagens (via APIs de TBOHolidays, Hotelbeds, Amadeus, etc.)
3. **Pagamento centralizado** — o usuário paga tudo dentro do nosso app
4. Consulta de **clima e previsão do tempo** por destino e data para otimizar passeios
5. Consulta de **notícias e eventos recentes** no destino (segurança, festivais, greves, etc.)
6. **Painel da agência** com status em tempo real de cada item da viagem (realizado / pendente / cancelado)
7. **Painel do consultor** com sua carteira de clientes e viagens ativas
8. Uso **direto pelo viajante final** (B2C) ou **via agência/consultor** (B2B)

---

## 3. Personas

### 3.1 Viajante Final (B2C)
- Quer planejar uma viagem sem precisar de agência
- Busca praticidade: quer tudo em um único app
- Valoriza sugestões inteligentes e personalizadas

### 3.2 Consultor de Agência (B2B - usuário operacional)
- Profissional contratado por uma agência
- Monta pacotes para clientes
- Precisa de ferramentas rápidas para buscar, montar e confirmar viagens
- Quer acompanhar o status das viagens que vendeu

### 3.3 Gestor da Agência (B2B - usuário administrativo)
- Dono ou gestor da agência de viagens
- Quer visibilidade sobre o desempenho da equipe
- Precisa de relatórios de vendas, viagens ativas e SLA de execução
- Quer garantir que cada viagem vendida está sendo entregue corretamente

---

## 4. Módulos da Plataforma

---

### Módulo 1 — IA de Roteiro de Viagem

**Objetivo:** Gerar roteiros personalizados e completos do zero com base nas preferências do usuário.

**Funcionalidades:**

- Formulário de entrada com: destino(s), datas, número de viajantes, perfil (família, casal, solo, negócios, aventura, cultural), orçamento estimado e preferências alimentares/mobilidade
- IA gera roteiro dia a dia com: horários sugeridos, pontos turísticos, restaurantes, tempo estimado em cada local, deslocamentos
- Integração com **API de clima e previsão do tempo** (ex.: OpenWeatherMap, WeatherAPI) para ajustar passeios ao tempo esperado
- Integração com **API de notícias** (ex.: NewsAPI, GNews) para alertar sobre eventos, greves, feriados locais ou riscos de segurança no destino
- Integração com **base de dados de atrações** (ex.: Google Places, Foursquare, TripAdvisor API) para enriquecer cada ponto do roteiro com fotos, avaliações e horários
- Roteiro editável pelo consultor ou pelo viajante após geração
- Exportação do roteiro em PDF ou compartilhamento via link

**Dados de entrada para a IA:**
```
- Destino(s)
- Data de ida e volta
- Número de adultos, crianças e bebês
- Tipo de viagem (lazer, lua de mel, aventura, cultural, negócios)
- Orçamento total estimado
- Preferências de hospedagem (hotel, pousada, resort, airbnb)
- Restrições alimentares
- Nível de mobilidade
- Interesses específicos (praias, museus, gastronomia, compras, etc.)
```

---

### Módulo 2 — Busca e Reserva de Passagens Aéreas

**Objetivo:** Permitir que o usuário pesquise e reserve voos sem sair da plataforma.

**Integrações de API sugeridas:**
- Amadeus Flight Offers API
- Duffel API
- TBO Holidays (aéreo)
- Skyscanner API (consulta de preços)

**Funcionalidades:**
- Busca de voos por origem, destino, datas e número de passageiros
- Filtros por: companhia aérea, número de escalas, horário, bagagem inclusa, faixa de preço
- Comparação de opções lado a lado
- Seleção de assentos (quando disponível via API)
- Adição ao pacote da viagem já em criação
- Exibição de bagagem, franquia e políticas de cancelamento
- Suporte a ida e volta e múltiplos destinos (multi-leg)

---

### Módulo 3 — Busca e Reserva de Hospedagem

**Objetivo:** Buscar e reservar hotéis, pousadas e outros tipos de acomodação diretamente na plataforma.

**Integrações de API sugeridas:**
- TBO Holidays (hotéis)
- Hotelbeds API
- Booking.com Affiliate API
- Expedia Rapid API
- Airbnb API (se disponível via parceiros)

**Funcionalidades:**
- Busca por destino, datas de check-in/check-out e número de hóspedes
- Filtros por: estrelas, tipo de acomodação, café da manhã incluso, localização, faixa de preço, avaliação
- Galeria de fotos, mapa de localização e descrição completa
- Comparação de propriedades
- Seleção de tipo de quarto e regime alimentar
- Adição ao pacote da viagem
- Visualização de políticas de cancelamento e pagamento

---

### Módulo 4 — Pacote de Viagem e Carrinho

**Objetivo:** Consolidar todos os itens selecionados (voo + hotel + passeios) em um único pacote para pagamento.

**Funcionalidades:**
- Carrinho de viagem com todos os itens adicionados
- Resumo do pacote: passagem(ns) + hospedagem(ns) + serviços opcionais
- Cálculo de total em tempo real
- Simulação de parcelamento
- Aplicação de cupons ou descontos da agência
- Visualização de políticas de cancelamento por item
- Botão de confirmação e pagamento centralizado

---

### Módulo 5 — Pagamento Centralizado

**Objetivo:** Processar o pagamento de todo o pacote dentro da plataforma, sem redirecionar o usuário para sites externos.

**Integrações sugeridas:**
- Stripe (cartão de crédito/débito internacional)
- Pagar.me ou Mercado Pago (mercado brasileiro: PIX, boleto, cartão)
- PagSeguro (alternativa)

**Funcionalidades:**
- Pagamento por cartão de crédito, débito, PIX ou boleto
- Parcelamento em até 12x (com juros conforme emissor)
- Emissão automática de recibo/nota fiscal
- Cobrança parcelada de itens com datas diferentes (ex.: sinal hoje, restante 30 dias antes da viagem)
- Reembolso automático em caso de cancelamento dentro da política
- Split de pagamento para comissionamento do consultor (ex.: 10% para o consultor, 90% para a agência)

---

### Módulo 6 — App do Viajante

**Objetivo:** Entregar ao viajante uma experiência completa durante toda a jornada, do planejamento ao pós-viagem.

**Funcionalidades:**
- Visualização do roteiro dia a dia
- Acesso offline aos documentos: vouchers, passagens, reservas de hotel, ingressos
- Alertas de voo em tempo real (mudança de portão, atraso, cancelamento)
- Notificações contextuais automáticas (ex.: "Seu check-in abre em 24h", "Saia agora para chegar ao aeroporto")
- Check-in online direto pelo app (quando disponível pela companhia aérea)
- Chat com o consultor/agência responsável
- Guias offline de destinos com pontos de interesse, avaliações, fotos e horários
- Clima atual e previsão dos próximos dias para o destino
- Notícias e alertas do destino
- Mapa integrado com rota até cada ponto do roteiro
- Gestor de despesas pessoais durante a viagem
- Diário de viagem com fotos e anotações
- Avaliação de cada serviço após uso (voo, hotel, passeio)

---

### Módulo 7 — Painel do Consultor

**Objetivo:** Dar ao consultor de agência uma visão completa de sua carteira de clientes e viagens.

**Funcionalidades:**
- Lista de viagens ativas, futuras e encerradas
- Status de cada item da viagem (confirmado, pendente, cancelado, realizado)
- Histórico de cada cliente
- Criação e edição de roteiros para clientes
- Busca e seleção de voos e hospedagens para compor pacotes
- Envio do pacote para aprovação/pagamento pelo cliente
- Acompanhamento de pagamentos (pago, parcial, pendente)
- Chat com viajantes durante a viagem
- Relatório de comissões geradas
- Notificações de alterações em reservas (ex.: mudança de horário de voo)

---

### Módulo 8 — Painel da Agência (Gestor)

**Objetivo:** Dar ao gestor da agência visibilidade operacional e financeira completa.

**Funcionalidades:**
- Dashboard com KPIs: número de viagens ativas, receita do mês, ticket médio, taxa de cancelamento
- Lista de todos os consultores e suas viagens
- Gestão de usuários: criação, edição e desativação de consultores
- Definição de níveis de acesso por função
- Relatório de desempenho por consultor
- Relatório de viagens: o que foi executado e o que ainda está pendente
- Alertas automáticos de itens críticos (ex.: voo em 24h sem check-in feito, hotel sem confirmação de pagamento)
- Controle financeiro: receitas, comissões pagas, saldo a receber
- Exportação de relatórios em PDF/CSV/Excel
- Configuração da identidade visual (logo, cores) exibida no app do viajante
- Gestão de subcontas (filiais ou marcas diferentes)

---

### Módulo 9 — Notificações e Alertas Inteligentes

**Objetivo:** Manter viajantes, consultores e gestores informados em tempo real.

**Tipos de notificação:**

| Destinatário | Evento | Canal |
|---|---|---|
| Viajante | Voo com atraso ou portão alterado | Push + SMS |
| Viajante | Check-in disponível (24h antes) | Push + Email |
| Viajante | Lembrete de passeio do dia | Push |
| Viajante | Alerta de clima adverso no destino | Push |
| Viajante | Notícia relevante no destino | Push |
| Consultor | Pagamento confirmado pelo cliente | Push + Email |
| Consultor | Alteração em reserva de voo ou hotel | Push + Email |
| Consultor | Viagem iniciada (cliente embarcou) | Push |
| Gestor | Consultor com viagem sem confirmação há X dias | Email |
| Gestor | Receita do dia/semana/mês | Email (relatório) |

---

### Módulo 10 — Integrações Externas

| Serviço | Finalidade |
|---|---|
| TBO Holidays | Passagens aéreas e hotéis |
| Hotelbeds | Hospedagem |
| Amadeus | Passagens aéreas + GDS |
| Duffel | Passagens aéreas |
| OpenWeatherMap / WeatherAPI | Clima e previsão do tempo |
| NewsAPI / GNews | Notícias e alertas do destino |
| Google Places API | Pontos de interesse, fotos, avaliações |
| Stripe / Pagar.me / Mercado Pago | Processamento de pagamentos |
| Firebase / OneSignal | Notificações push |
| Twilio | SMS |
| SendGrid / Amazon SES | Email transacional |
| Google Maps / Mapbox | Mapas e rotas |
| Anthropic Claude API | Motor de IA para geração de roteiros |

---

## 5. Arquitetura de Usuários e Perfis de Acesso

```
Plataforma
├── Viajante Final (B2C)
│   └── Acesso via app mobile (iOS/Android) ou web
│
├── Consultor
│   ├── Criado pela Agência ou auto-cadastrado
│   └── Acesso via painel web + app mobile
│
└── Gestor da Agência
    ├── Admin principal da conta da agência
    └── Acesso via painel web
```

---

## 6. Modelo de Negócio

### 6.1 Receitas

| Fonte | Modelo |
|---|---|
| Assinatura da agência | Planos mensais/anuais (SaaS) |
| Comissão sobre reservas | % sobre cada passagem e hotel reservados via plataforma |
| Taxa de processamento de pagamento | % sobre transações realizadas na plataforma |
| Plano B2C para viajante direto | Assinatura mensal ou taxa por viagem criada |
| White-label para grandes agências | Licença customizada |

### 6.2 Planos Sugeridos (referência inicial)

| Plano | Público | Preço estimado | Destaque |
|---|---|---|---|
| Starter | Agente independente | R$ 97/mês | Até 2 usuários, 60 créditos/ano |
| Pro | Agências médias | R$ 197/mês | Até 5 usuários, busca e reserva integrada |
| Business | Agências grandes | R$ 397/mês | Até 15 usuários, painel gestor completo, API |
| Enterprise | Operadoras e redes | Sob consulta | White-label, integrações customizadas |

> Crédito = 1 viajante por viagem publicada (mesmo modelo do Meu Agente).

---

## 7. Diferenciais Competitivos Resumidos

| Funcionalidade | Meu Agente | Nossa Plataforma |
|---|---|---|
| Itinerário digital | ✅ | ✅ |
| Vouchers e documentos offline | ✅ | ✅ |
| Alertas de voo em tempo real | ✅ (Pro+) | ✅ |
| Chat com consultor | ✅ | ✅ |
| Guias offline | ✅ (1.950 destinos) | ✅ |
| App co-branded | ✅ | ✅ |
| **IA que cria roteiro do zero** | ❌ (importa PDF) | ✅ |
| **Busca de voos integrada** | ❌ | ✅ |
| **Busca de hotéis integrada** | ❌ | ✅ |
| **Pagamento dentro do app** | ❌ | ✅ |
| **Consulta de clima por destino/data** | ❌ | ✅ |
| **Notícias e alertas do destino** | ❌ | ✅ |
| **Painel operacional da agência** | ❌ | ✅ |
| **Controle do que foi/não foi realizado** | ❌ | ✅ |
| **Relatório financeiro para gestor** | ❌ | ✅ |
| **Comissionamento automático do consultor** | ❌ | ✅ |
| Uso B2C (viajante direto, sem agência) | ❌ | ✅ |

---

## 8. Landing Page e Estratégia de Domínio

### 8.1 Separação de Domínio

A plataforma adota uma separação clara entre site público e produto:

| URL | Finalidade |
|---|---|
| `seudominio.com` | Landing page pública — conversão, marketing e SEO |
| `app.seudominio.com` | Portal do produto — acesso exclusivo para usuários ativos |

Essa divisão traz três benefícios concretos: a landing page pode ser otimizada livremente para SEO e testes A/B sem afetar a estabilidade do produto; o subdomínio `app.` transmite imagem profissional e passa a sensação de que o usuário está entrando em um sistema dedicado; e os deploys de marketing e de produto ficam desacoplados, permitindo que a equipe altere a landing sem risco de afetar sessões ativas.

No contexto do monorepo, isso se traduz em:
- `apps/web/app/(marketing)/` → servido em `seudominio.com`
- `apps/web/app/(dashboard)/` → servido em `app.seudominio.com` via Vercel rewrites ou projeto separado

### 8.2 Estrutura da Landing Page

Baseado na análise do Meu Agente e nos nossos diferenciais, a landing page deve seguir esta estrutura:

### Seção 1 — Hero
- Headline principal focada no maior diferencial: **"Monte, compre e gerencie toda a viagem em um só lugar."**
- Subheadline explicando o público: agências, consultores e viajantes
- CTA: **"Testar grátis por 14 dias"** + **"Ver demonstração"**
- Prova social rápida (número de agências, viagens, avaliação nas lojas)

### Seção 2 — Problema
- O que acontece hoje: o agente monta o roteiro em um sistema, compra em outro, confirma em outro, e o cliente fica perdido sem saber o status de nada
- Comparativo visual "Antes x Depois"

### Seção 3 — Solução (Como funciona)
- 3 passos: (1) IA monta o roteiro → (2) Você pesquisa e compra tudo integrado → (3) Viajante acompanha tudo no app
- Ícones ou animação mostrando o fluxo

### Seção 4 — Funcionalidades Principais
- Cards com: IA de Roteiro, Busca de Voos, Busca de Hotéis, Pagamento Centralizado, App do Viajante, Painel da Agência
- Destaque para os diferenciais exclusivos (vs concorrentes)

### Seção 5 — Para Quem É
- Tabs ou cards: Agência de Viagens / Consultor Independente / Viajante que planeja sozinho

### Seção 6 — Depoimentos
- Depoimentos de agências e consultores (coletar após beta)
- Avaliação nas lojas (App Store / Google Play)

### Seção 7 — Planos e Preços
- Tabela de planos com toggle Mensal/Anual
- Destaque no plano mais popular
- Simulador de custo por viajante (igual ao Meu Agente — funciona muito bem)

### Seção 8 — FAQ
- 8 a 12 perguntas cobrindo: créditos, cancelamento, integrações, como funciona o pagamento, APIs usadas

### Seção 9 — CTA Final
- Headline de urgência + botão de teste grátis

---

## 9. Fases de Desenvolvimento Sugeridas

### Fase 1 — MVP (3-4 meses)
- [ ] Autenticação (agência, consultor, viajante)
- [ ] IA de geração de roteiro (Claude API)
- [ ] Busca de hotéis via TBO Holidays
- [ ] Busca de voos via Amadeus ou Duffel
- [ ] Carrinho e pagamento (Stripe + Pagar.me)
- [ ] App do viajante (roteiro + documentos offline)
- [ ] Painel básico do consultor
- [ ] Notificações push básicas

### Fase 2 — Crescimento (2-3 meses após MVP)
- [ ] Painel completo da agência (gestor)
- [ ] Integração clima (OpenWeatherMap)
- [ ] Integração notícias do destino (NewsAPI)
- [ ] Alertas de voo em tempo real
- [ ] Check-in online pelo app
- [ ] Relatórios financeiros e de performance
- [ ] Comissionamento automático de consultores

### Fase 3 — Escala (2-3 meses após Fase 2)
- [ ] White-label para grandes agências
- [ ] API pública para integrações externas
- [ ] Importação via GDS (Amadeus/Sabre)
- [ ] Localização GPS do viajante (para grupos)
- [ ] Realidade aumentada nos guias
- [ ] Programa de afiliados para consultores

---

## 10. Observações Finais

- A plataforma deve ser desenvolvida como **web-first responsivo** com apps nativos iOS e Android
- Priorizar **UX mobile** desde o início, já que o uso em viagem acontece 100% no celular
- O **diferencial de pagamento centralizado** é o maior gap do mercado atual — deve ser o ponto central do marketing
- Investir em parcerias com TBO Holidays e Hotelbeds desde o início para garantir margem competitiva nas reservas
- O modelo de comissão sobre reservas (além da assinatura) cria uma segunda fonte de receita recorrente e escalável

---

*Documento gerado em junho/2026. Revisar antes de cada sprint de desenvolvimento.*
