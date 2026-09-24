# Mobile UI Unification — Design

## Context

The mobile app (`apps/mobile`) has gone through a partial visual redesign. `index.tsx`, `explore.tsx`, `utilities.tsx`, `auth-screen.tsx`, and the tab bar (`app-tabs.tsx` / `app-tabs.web.tsx`) already use the newer visual language defined in `constants/theme.ts` (`Brand`, `Spacing`, `Radius`): navy (`#073BCE` / `#061D59`) and coral (`#FF6542`) as the brand colors, large corner radii (18-22px on cards, 12-14px on buttons/inputs), bold display typography, eyebrow+title header pattern, and soft-shadowed cards.

Four screens were never migrated and still use an older, hardcoded palette (`#F26B3A` coral, `#183B4E` navy) with small corner radii (8-12px) and plain headers: `chat.tsx`, `diary.tsx`, `expenses.tsx`, `documents.tsx`. They read as a different, older product next to the rest of the app.

Two small, unrelated bugs were found during the audit and are cheap to fix in the same pass:
- `app-tabs.tsx` renders the "Explorar" tab with `home.png` instead of the existing, unused `explore.png` asset.
- `themed-text.tsx`'s `linkPrimary` style is hardcoded to the old coral (`#F26B3A`) instead of `Brand.coral`.

`app/trip/[id].tsx` is dead code: no in-app navigation points to it (confirmed via repo-wide grep), and it duplicates — with an inferior, unmigrated UI — what `explore.tsx` already does (day-by-day timeline, document list, progress tracking). It will be deleted rather than reskinned.

`useTheme()` always returns `Colors.light` (dark mode is intentionally disabled per a comment in that file), so dark-mode support is out of scope — screens hardcoding light-only colors is not a bug to fix here.

## Goals

- Bring `chat.tsx`, `diary.tsx`, `expenses.tsx`, and `documents.tsx` visually in line with `index.tsx` / `explore.tsx` / `utilities.tsx`: same brand colors, corner radii, spacing tokens, header pattern, button style, card style, and empty-state style.
- Fix the two small bugs (tab icon, `linkPrimary` color).
- Remove the dead `app/trip/[id].tsx` route.

## Non-goals

- No dark-mode work.
- No extraction of shared components (`Card`, `ScreenHeader`, `EmptyState`, etc.). Each screen keeps its own local `StyleSheet`, matching the repo's existing convention (even the already-migrated screens don't share such components).
- No changes to data/state logic (`use-traveler-store.ts`, `traveler-api.ts`), navigation structure, or feature behavior — this is a visual-only pass.
- No changes to `auth-screen.tsx`, `index.tsx`, `explore.tsx`, `utilities.tsx`, or the tab bar's structure — they're already the target style (only the two named bugs are touched there).

## Design language reference (target style, already established)

Pulled from `index.tsx`, `explore.tsx`, `utilities.tsx`:

- **Colors**: `Brand.navy` / `Brand.navyDeep` for headings and dark UI elements (replacing `#183B4E`); `Brand.coral` for primary actions/accents (replacing `#F26B3A`). Semantic colors that aren't brand-related (e.g., document-type badges: PDF red, image blue) stay as-is.
- **Radius**: cards `Radius.large` (20) or close to it (18-22 observed in practice); buttons/inputs `Radius.medium` (14); pills/chips `Radius.pill` (999).
- **Spacing**: use `Spacing.*` tokens instead of raw numbers where a screen is being touched anyway.
- **Headers**: small uppercase eyebrow label (coral or navy, bold, letter-spaced) above a bold 24-28px title, replacing the plain single-size header title.
- **Buttons**: primary CTA = coral background, bold white text, radius 14.
- **Cards**: `theme.backgroundElement` background, `theme.backgroundSelected` border, radius ~18-20, soft shadow (`shadowOpacity` ~0.04-0.06).
- **Empty states**: rounded icon "tile" (soft-colored square, ~48-56px) instead of a raw emoji floating alone, bold title, secondary description, CTA button.
- **Badges/chips**: pill-shaped (radius 999), soft background tint + bold small-caps text.

## Per-file changes

### `apps/mobile/src/app/chat.tsx`
- `agentAvatar` background and traveler message bubble background: `#183B4E` → `Brand.navyDeep`.
- Send button background: `#F26B3A` / pressed `#DF5A2C` → `Brand.coral` / a pressed-darker coral literal.
- Empty-chat state: replace the bare emoji with an icon tile (rounded square, soft background), bump text weight/size to match other empty states.
- Header stays functionally the same (agency avatar + name + online dot); only recolor to brand tokens.

### `apps/mobile/src/app/diary.tsx`
- Header: switch from single-size `headerTitle` to eyebrow + bold title pattern.
- "+ Escrever" button: background `#F26B3A` → `Brand.coral`, radius 8 → 14.
- Day badge background `#183B4E` → `Brand.navyDeep`.
- Cards: radius → 18-20, border/shadow tuned to match `explore.tsx` item cards.
- Modal sheet: radius 20 → 24 (matching `index.tsx`'s import modal); input/button radii → 14.
- Empty state: icon tile treatment.

### `apps/mobile/src/app/expenses.tsx`
- Same header treatment as Diary.
- "+ Adicionar" button and total card: `#F26B3A` / `#183B4E` → `Brand.coral` / `Brand.navyDeep`.
- Category/currency chips: selected-state background `#183B4E` → `Brand.navyDeep`.
- Cards: radius → 18-20.
- Modal: radius 20 → 24; input/button radii → 14.
- Empty state: icon tile treatment.

### `apps/mobile/src/app/documents.tsx`
- Header: eyebrow + bold title pattern.
- "Abrir/Ver documento" button: `#F26B3A` → `Brand.coral`.
- Section title / trip badge text color: `#183B4E` → `Brand.navyDeep`.
- Cards: radius 12 → 18.
- Document-type badge colors (`TYPE_COLORS`) are semantic, not brand — left unchanged.
- Empty and loading states: icon tile treatment.

### `apps/mobile/src/components/app-tabs.tsx`
- Fix the "Explorar" trigger to use `require('@/assets/images/tabIcons/explore.png')` instead of `home.png`.

### `apps/mobile/src/components/themed-text.tsx`
- `linkPrimary.color`: `'#F26B3A'` → `Brand.coral` (import `Brand` from `@/constants/theme`).

### `apps/mobile/src/app/trip/[id].tsx`
- Delete the file (dead code, superseded by `explore.tsx`).

## Verification

Since this is a visual-only change with no logic changes, verification is manual, screen by screen, using the browser preview (`preview_start` for the Expo web target) or simulator:
- After each screen is restyled, open it and visually compare against `index.tsx`/`explore.tsx` for consistency (colors, radius, spacing, header pattern).
- Confirm empty states still render correctly (no data / no trip selected).
- Confirm modals (Diary "Nova Entrada", Expenses "Nova Despesa") still open, validate, and submit correctly — only styling changes, but modals are the highest-risk surface for a visual regression (overlapping elements, cut-off text).
- Confirm the tab bar shows the correct icon for "Explorar" after the fix.
- Run existing type-checking (`tsc`) if configured for the mobile app, to catch any accidental prop/import breakage from the edits.

## Risks

- Minimal: this is a styling-only pass on plain-`StyleSheet` React Native code, touching color/radius/spacing constants and JSX for headers/empty-states. No shared components are introduced, so a mistake in one screen cannot affect another.
- Deleting `trip/[id].tsx` is a one-way action confirmed as safe via grep (no internal references) and explicit user approval; git history preserves it if ever needed again.
