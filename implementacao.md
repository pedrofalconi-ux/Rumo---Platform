# Especificação Técnica: Abas de Transporte e Hotel na Criação de Viagem
Esta especificação técnica detalha a implementação de duas novas abas no formulário de criação de viagem: **Transporte** (voos, ônibus, trens, etc.) e **Hotel** (acomodações vinculadas aos destinos). O objetivo é coletar o contexto logístico completo da viagem para que a Inteligência Artificial elabore roteiros sob medida e hiper-personalizados.
---
## 1. Modelo de Dados (Database Schema)
Tanto o banco de dados local (`packages/db/data/trips.json`) quanto as tabelas do **Supabase** (`itineraries`) devem ser atualizados para persistir as informações adicionais.
### 1.1. Estrutura de Transporte (`transportation`)
Um array de objetos armazenado no registro da viagem:
```typescript
interface TransportationEntry {
  id: string;
  type: 'voo' | 'barco' | 'onibus' | 'aluguel_carro' | 'balsa' | 'carro_privativo' | 'shuttle' | 'taxi' | 'trem' | 'bonde';
  operator: string;      // ex: "LATAM", "Cometa"
  number: string;        // ex: "LA8072", "Placa do Carro"
  date: string;          // Formato: YYYY-MM-DD
  details: string;       // Detalhes extras inseridos pelo consultor
}
```
### 1.2. Estrutura de Acomodação (`accommodations`)
Um array de objetos contendo os hotéis selecionados para cada destino:
```typescript
interface AccommodationEntry {
  id: string;
  destinationCity: string;   // Cidade de destino vinculada
  name: string;              // Nome do hotel
  address?: string;          // Endereço completo
  checkIn: string;           // Formato: YYYY-MM-DD
  checkOut: string;          // Formato: YYYY-MM-DD
  placeId?: string;          // Referência do Google Places API (opcional)
  photos?: string[];         // URLs das fotos convertidas em Base64
}
```
---
## 2. Interface do Usuário (UI/UX)
No formulário de criação de nova viagem (`apps/web/app/(dashboard)/trips/new/page.tsx`), deve ser incluído um novo bloco de navegação por abas ou seções retráteis organizando os dados.
### 2.1. Seção: Transporte
Permite que o consultor adicione múltiplos modais de transporte à viagem.
#### Elementos Visuais e Fluxo:
1. **Dropdown de Seleção do Modal**:
   Exibe o ícone correspondente ao modal ativo (ex: ✈️ para Voo, 🚆 para Trem). Ao clicar, abre uma lista suspensa com as opções:
   - ✈️ **Voo** (Ícone: `flight`)
   - 🚢 **Barco** (Ícone: `directions_boat`)
   - 🚌 **Ônibus** (Ícone: `directions_bus`)
   - 🚗 **Aluguel de Carro** (Ícone: `car_rental`)
   - ⛴️ **Balsa** (Ícone: `sailing`)
   - 🚘 **Carro privativo** (Ícone: `local_taxi`)
   - 🚐 **Shuttle** (Ícone: `airport_shuttle`)
   - 🚕 **Táxi** (Ícone: `taxi_alert`)
   - 🚆 **Trem** (Ícone: `train`)
   - 🚋 **Bonde** (Ícone: `tram`)
2. **Inputs da Linha**:
   - **Cia. Aérea / Operadora**: Input de texto ou select.
   - **Voo # / Código**: Input de texto pequeno para número do voo ou localizador.
   - **Data**: Input de data simplificado com datepicker.
   - **Detalhes**: Input de texto `"Insira detalhes do voo"` para notas complementares.
3. **Botão Adicionar**: Adiciona o modal ao array de transporte e limpa a linha para novas inserções.
4. **Lista de Adicionados**: Abaixo do formulário, exibe os transportes inseridos com um botão de exclusão (`delete`).
---
### 2.2. Seção: Hotel
Permite vincular acomodações aos destinos selecionados para a viagem.
#### Elementos Visuais e Fluxo:
* **Validação de Destinos**: 
  Caso o consultor ainda não tenha adicionado nenhum destino nas seções anteriores, a aba exibe a mensagem de aviso:
  > *"Para adicionar as acomodações, você precisa primeiro adicionar o(s) destino(s)."*
* **Fluxo de Adição**:
  1. **Seleção de Destino**: Um dropdown exibindo os destinos que o usuário já listou na viagem (ex: "Paris", "Londres").
  2. **Procura de Acomodação**: Campo de busca inteligente com autocompletar conectado à API de hotéis/lugares do Google.
  3. **Opção Manual ("Criar Novo")**: Botão que abre um modal caso o hotel não seja encontrado nas APIs externas, permitindo preencher Nome, Endereço e Datas manualmente.
  4. **Campos de Data**: Inputs de Check-in e Check-out (validados para caber dentro do período da viagem naquele destino).
---
## 3. Integração com APIs e Google Places
Para automatizar a busca de hotéis e capturar imagens reais dos estabelecimentos diretamente do **Google Meu Negócio (Google Places API / Google Business)**:
### 3.1. Rota da API de Busca (`/api/media/hotels/search`)
Crie um endpoint no Next.js para realizar a busca no Google Places:
```typescript
// Exemplo de chamada para Google Places API (New)
const url = 'https://places.googleapis.com/v1/places:searchText';
const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
    'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.photos'
  },
  body: JSON.stringify({
    textQuery: query, // Ex: "Copacabana Palace Rio de Janeiro"
  })
});
```
### 3.2. Download e Conversão de Imagens (Base64)
Para evitar o vencimento das URLs temporárias das fotos do Google Places:
1. Ao selecionar o hotel, recupere o array de `photos` retornado pelo Google.
2. Faça o download da imagem via endpoint do Google Media (`https://places.googleapis.com/v1/${photoName}/media`).
3. Converta a imagem em Base64 utilizando nosso utilitário `convertUrlToBase64` já existente em [base64-converter.ts](file:///Users/pedrohenriquefalconi/Desktop/Rumo---Platform/apps/web/lib/media/base64-converter.ts).
4. Persista a foto em Base64 diretamente no array `photos` do hotel na tabela de banco de dados.
---
## 4. Injeção de Contexto na Inteligência Artificial (AI Engine)
Com os dados de logística integrados ao banco, a IA terá visibilidade total do deslocamento do cliente. Atualize as seguintes funções em `packages/ai/prompts/index.ts`:
### 4.1. Atualização do Prompt de Planejamento Macro (`buildPlanTripPrompt`)
Adicione a logística de chegada e estadia no prompt inicial para que a IA estruture os temas dos dias considerando o hotel ativo:
```typescript
// Em buildPlanTripPrompt:
const transportContext = input.transportation?.length
  ? input.transportation.map(t => `- ${t.type.toUpperCase()}: ${t.operator} ${t.number} em ${t.date}`).join('\n')
  : 'Nenhum transporte cadastrado';
const accommodationContext = input.accommodations?.length
  ? input.accommodations.map(a => `- Hotel: ${a.name} em ${a.destinationCity} (Check-in: ${a.checkIn}, Check-out: ${a.checkOut})`).join('\n')
  : 'Nenhuma acomodação cadastrada';
return `Você é um roteirista sênior de viagens...
...
Contexto Logístico do Passageiro:
[Logística de Transporte]
${transportContext}
[Logística de Hotéis/Acomodação]
${accommodationContext}
Instruções para Roteiro:
1. No dia de chegada (baseado nos voos/transportes), inclua tempo de traslado do aeroporto/estação para o hotel específico.
2. Certifique-se de que o ponto de início e término dos dias seja compatível com a localização do hotel correspondente à data.
...`;
```
### 4.2. Atualização do Prompt Diário (`buildGenerateDayPrompt`)
Injete o hotel do dia no prompt que monta os blocos de conteúdo para que a IA crie atividades e jantares próximos ao hotel:
```typescript
// Em buildGenerateDayPrompt:
// Encontre se há hotel cadastrado para a data do dia gerado
const hotelDoDia = input.accommodations?.find(a => dayPlan.date >= a.checkIn && dayPlan.date <= a.checkOut);
return `Gere uma trilha diária real...
...
Hotel onde o passageiro dormirá hoje: ${hotelDoDia ? `${hotelDoDia.name} (${hotelDoDia.address})` : 'Não especificado'}
Instruções Adicionais:
- O hotel serve como base de partida pela manhã e retorno à noite.
- Recomende restaurantes locais e passeios de fim de tarde que facilitem o deslocamento de volta para o hotel especificado.
...`;
```
---
## 5. Plano de Validação e Testes
1. **Testes de UI**:
   - Validar se a aba de Hotel bloqueia inputs e exibe a mensagem de aviso caso nenhum destino tenha sido adicionado.
   - Validar se o dropdown de Transporte renderiza o ícone do modal selecionado e insere na lista sem recarregar a tela.
2. **Testes de Integração**:
   - Simular busca de acomodação para garantir que a consulta do Google Places retorna o local correto e converte as fotos para Base64 antes de salvar.
3. **Validação da IA**:
   - Submeter uma viagem contendo um Voo de chegada às 14:00 e o Hotel Copacabana Palace. Verificar se o roteiro do Dia 1 gerado pela IA inclui o transfer do Galeão/Santos Dumont e o check-in no Copacabana Palace no fim da tarde.
