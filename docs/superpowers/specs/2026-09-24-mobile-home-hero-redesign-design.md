# Mobile Home Screen — Hero Trip Card Redesign

## Context

The traveler home screen (`apps/mobile/src/app/index.tsx`) currently renders trip cards as plain text blocks (agency initials in a small square, title, status badge, destination line, meta row, text-only "Explorar roteiro →" footer). The user wants a more professional, travel-industry-aesthetic look, and specifically wants the trip's cover photo (`MobileItinerary.coverImage`, already fetched by `traveler-api.ts` but unused in the UI) to appear on this screen.

Explored via the brainstorming visual companion (3 mockup directions: hero-photo card, split-thumbnail card, editorial card-with-floating-badge). The user picked **the hero-photo direction** and confirmed a full-screen mockup that also lightly refreshes the header and welcome block to match. Approved as-is ("PODE IMPLEMENTAR").

## Goal

Redesign the trip card on the home screen so the cover photo is the dominant visual element (full-bleed background image, dark gradient overlay at the bottom for text legibility, agency badge and status badge floating on the photo, title/destination overlaid in white). Lightly refresh the header and welcome block to feel cohesive with the new card (subtle decorative glow, matching the existing onboarding screens' visual language in `auth-screen.tsx`).

## Non-goals

- No changes to `explore.tsx`, `chat.tsx`, `diary.tsx`, `expenses.tsx`, `documents.tsx`, the tab bar, or the import-trip modal's internals (only the trip card and the header/welcome block above it change).
- No backend/data changes — `coverImage` already exists on `MobileItinerary` and is already populated by `traveler-api.ts`; this is a rendering-only change.
- No new shared components — restyle `index.tsx`'s existing local `StyleSheet`, consistent with the rest of the app's convention (confirmed in the prior mobile-UI-unification pass).

## Design

**Trip card (`renderTripCard`):**
- Card becomes a photo-first layout: an `Image` (from `expo-image`, already imported) rendered as the card's top section at a fixed height (~180), using `item.coverImage` as the source, `contentFit="cover"`.
- A `LinearGradient`-style bottom-to-transparent dark overlay sits over the photo so white text stays legible regardless of the photo's content. Since the project doesn't currently depend on `expo-linear-gradient`, use a semi-transparent dark `View` overlay (a flat scrim, not a true gradient) to avoid adding a new dependency — acceptable given the goal is legibility, not a visually graduated fade. If `expo-linear-gradient` is already a transitive dependency of `expo`, prefer it for a true gradient; check before deciding.
- Overlaid on the photo: the agency badge (initials, same fallback logic as today) top-left, the status badge (Pendente/Confirmado/etc, same logic as today) top-right, and the trip title + "agency · destination" line bottom-left in white bold text.
- Below the photo, a compact footer row (white background, matching the card's border-radius at the bottom) with the existing meta info (dates, itinerary block count) on the left and "Explorar roteiro →" as a text+arrow link on the right — this footer keeps the same information already shown today, just restyled to sit below the photo instead of being the whole card.
- **Fallback when `coverImage` is missing or fails to load:** render a gradient-ish placeholder (a `View` with the app's navy brand color as background, since a true image gradient isn't warranted for a placeholder) instead of an `Image`, with a large centered travel-themed glyph (e.g. a compass/map pin emoji or a simple icon) at low opacity, so the layout doesn't break for trips without a cover photo (confirmed some seed trips have none). Use `expo-image`'s `onError` (or a `useState` flag) to fall back to the placeholder if the URL fails to load, matching the pattern already used for agency logos on the same screen.
- Card corner radius, shadow, and overall footprint follow the same conventions already established in the prior mobile-UI-unification pass (18-20px radius, soft shadow).

**Header:**
- Same content and behavior (agency logo/mark, agency name + eyebrow, "+ Viagem" button, logout button) — only minor spacing/sizing polish, no structural change.

**Welcome block:**
- Same copy and content. Adds one subtle decorative rounded-glow shape behind the text (semi-transparent circle, absolutely positioned, `overflow: hidden` on the parent), reusing the same visual device already present in `auth-screen.tsx`'s onboarding screens (`onboardingGlow`/`heroGlow` pattern) for visual consistency across the app, not a new design language.

**Section heading ("Suas viagens" / count):** unchanged.

## Verification

This is a visual-only change to one screen. Since authenticating in the mobile app from this environment would hit the production API (`EXPO_PUBLIC_API_URL` points at the deployed backend) and no test traveler account is available here, live in-app verification is left to the user, who already has the app running (per the screenshot they shared). Before handing off: run `cd apps/mobile && npx tsc --noEmit` to confirm no type errors, and read the final JSX/styles once for structural correctness (balanced tags, no orphaned styles).
