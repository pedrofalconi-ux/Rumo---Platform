# IA de roteiros - estrategia de modelos e custos do MVP

Data da analise: 2026-06-25

Fontes oficiais:
- Precos Gemini API: https://ai.google.dev/gemini-api/docs/pricing
- Catalogo de modelos Gemini API: https://ai.google.dev/gemini-api/docs/models
- Limites/rate limits Gemini API: https://ai.google.dev/gemini-api/docs/rate-limits

## Problema observado

Durante a geracao da viagem `HOR-8526`, o backend chegou corretamente ao Gemini, mas a API retornou:

`429 RESOURCE_EXHAUSTED`

Mensagem principal:

`Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-2.5-flash`

Isso indica limite de requisicoes da camada gratuita, nao erro de prompt ou parse. Como o roteiro usa uma chamada para o planejamento macro e uma chamada por dia, uma viagem de 8 dias consome pelo menos 9 chamadas, antes de retries, imagens e regeneracoes.

## Modelos recomendados

### Principal: Gemini 2.5 Flash

Modelo: `gemini-2.5-flash`

Uso recomendado:
- Geracao principal de roteiros.
- Melhor equilibrio entre qualidade, raciocinio, velocidade e custo.
- Bom para montar itinerarios realistas, com horarios, contexto e otimizacao geografica.

Preco pago oficial, por 1M tokens:
- Input: US$ 0.30
- Output: US$ 2.50

Ponto de atencao:
- A camada gratuita tem limites baixos para uso real de produto.
- Para MVP com usuarios reais, depender do free tier vai gerar falhas 429 com frequencia.

### Fallback barato: Gemini 2.5 Flash-Lite

Modelo: `gemini-2.5-flash-lite`

Uso recomendado:
- Fallback automatico quando o Flash bater cota/indisponibilidade.
- Geracao de dias menos complexos.
- Regeneracoes simples.
- Ambientes de teste e homologacao.

Preco pago oficial, por 1M tokens:
- Input: US$ 0.10
- Output: US$ 0.40

Trade-off:
- Muito mais barato.
- Pode ser menos forte em roteiros complexos, mas ainda deve servir para MVP se o prompt estiver bem estruturado.

### Nao recomendado como padrao: Gemini 3.x / Pro

Uso possivel:
- Casos premium.
- Roteiros muito complexos.
- Planejamento com multiplos paises, restricoes fortes e necessidade de maior qualidade.

Motivo para nao usar no MVP:
- Custo maior.
- O ganho de qualidade nao compensa para a primeira versao se o gargalo ainda e produto, fluxo e UX.

## Estimativa de custo por roteiro

Base observada nos logs locais:
- Planejamento macro: cerca de 1k tokens de input e 0.5k a 1k tokens de output.
- Cada dia: cerca de 1.6k a 1.8k tokens de input e 1.8k a 2.6k tokens de output.

Estimativa para roteiro de 8 dias:
- Input aproximado: 15k tokens.
- Output aproximado: 19k a 22k tokens.

Com Gemini 2.5 Flash:
- 15k input * US$ 0.30 / 1M = US$ 0.0045
- 22k output * US$ 2.50 / 1M = US$ 0.0550
- Total aproximado por roteiro: US$ 0.06

Com Gemini 2.5 Flash-Lite:
- 15k input * US$ 0.10 / 1M = US$ 0.0015
- 22k output * US$ 0.40 / 1M = US$ 0.0088
- Total aproximado por roteiro: US$ 0.01

Observacao: esses valores nao incluem chamadas extras de regeneracao, busca de imagens, Google Search grounding, Google Maps grounding ou retries.

## Estrategia implementada no projeto

Variaveis:

```env
LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODELS=gemini-2.5-flash-lite,gemini-1.5-flash
LLM_TEMPERATURE=0.4
LLM_MAX_TOKENS=8192
```

Fluxo:
- Tenta `LLM_MODEL`.
- Se receber erro de cota/indisponibilidade/modelo nao encontrado, tenta os modelos em `GEMINI_FALLBACK_MODELS`.
- Se todos falharem, retorna erro consolidado listando os modelos tentados.

Nota sobre `gemini-1.5-flash`:
- Foi deixado como fallback configuravel porque foi citado como alternativa operacional.
- A documentacao atual do Gemini destaca a familia 2.5/3.x; por isso, a recomendacao oficial do MVP e usar `gemini-2.5-flash-lite` como fallback principal.

## Recomendacao para o MVP

1. Usar `gemini-2.5-flash` como modelo principal.
2. Usar `gemini-2.5-flash-lite` como fallback automatico.
3. Habilitar billing pago antes de testes com usuarios reais.
4. Manter geracao incremental por dia para reduzir sensacao de travamento.
5. Salvar parcial a cada dia gerado, mesmo se um dia falhar.
6. Adicionar uma fila assíncrona quando houver mais de um usuario gerando roteiros ao mesmo tempo.
7. Futuramente, separar etapas:
   - Planejamento macro: Flash.
   - Dias comuns: Flash-Lite.
   - Dias complexos/premium: Flash.
   - Revisao final de qualidade: Flash ou Pro, apenas em planos pagos.

## Proxima evolucao recomendada

Para reduzir custo e falhas:
- Cachear o plano macro por `tripId` e prompt hash.
- Permitir regenerar apenas dias com falha.
- Limitar roteiros longos: gerar primeiro 3 dias, depois continuar em background.
- Criar uma tabela/fila de jobs de IA com status por dia.
- Separar imagens da geracao textual, para nao bloquear o roteiro se Pixabay falhar.
