# Tipografia

Fonte: [`apps/mobile/src/constants/theme.ts`](../apps/mobile/src/constants/theme.ts), [`apps/mobile/src/global.css`](../apps/mobile/src/global.css) e [`apps/web/app/globals.css`](../apps/web/app/globals.css)

## Dashboard web

- **Sans (texto padrão)**: `Inter, "Avenir Next", "Segoe UI", Arial, Helvetica, sans-serif`
- **Mono**: `SFMono-Regular, Consolas, monospace`
- Ícones: Material Symbols Outlined (Google Fonts)

## App mobile (web build)

- **Display/sans**: `Spline Sans, Inter, ui-sans-serif, system-ui, sans-serif`
- **Mono**: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas`
- **Rounded**: `SF Pro Rounded, Hiragino Maru Gothic ProN, Meiryo, MS PGothic, sans-serif`
- **Serif**: `Georgia, Times New Roman, serif`

## App mobile (iOS/Android nativo)

Usa as fontes do sistema operacional (`system-ui`, `ui-serif`, `ui-rounded`, `ui-monospace` no iOS; `normal`/`serif`/`monospace` no Android), não uma fonte customizada embarcada.

**Fonte principal de marca: Inter** (usada no logo e como base do texto). Spline Sans aparece como fonte de destaque no mobile web.
