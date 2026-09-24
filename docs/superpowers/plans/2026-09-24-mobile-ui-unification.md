# Mobile UI Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the four legacy-styled mobile screens (Chat, Diário, Despesas, Documentos) visually in line with the already-redesigned screens (Início, Explorar, Utilidades), fix two small bugs found during the audit, and remove one dead-code route.

**Architecture:** Visual-only edits to existing React Native `StyleSheet` objects and the JSX that uses them, screen by screen. No new shared components, no changes to data/state/navigation logic. Each screen keeps its own local styles, matching the codebase's existing convention.

**Tech Stack:** Expo / React Native, TypeScript, `expo-router`, plain `StyleSheet.create`.

## Global Constraints

- No dark-mode work — `useTheme()` always returns `Colors.light` by design (`apps/mobile/src/hooks/use-theme.ts`); this is intentional and out of scope.
- Do not extract shared components (`Card`, `ScreenHeader`, `EmptyState`, etc.) — restyle each screen's local `StyleSheet` directly.
- Do not touch `index.tsx`, `explore.tsx`, `utilities.tsx`, `auth-screen.tsx`, or the tab bar's structure/behavior — only the two named bugs below touch already-migrated files, and only cosmetically.
- Brand colors to use everywhere a legacy hex appears: `Brand.navyDeep` (`#061D59`) replaces `#183B4E`; `Brand.coral` (`#FF6542`) replaces `#F26B3A`. Pressed/darker coral state (buttons with a `pressed` interaction) uses the literal `#D95638`.
- Corner radii: cards → `18`; buttons/inputs → `14`; bottom-sheet modals → `24`.
- Semantic (non-brand) colors — e.g. `documents.tsx`'s `TYPE_COLORS` for PDF/image/generic file badges — are left unchanged.
- After every task, run `cd apps/mobile && npx tsc --noEmit` and confirm no new errors before committing.

---

### Task 1: Bug fixes and dead-code removal

**Files:**
- Modify: `apps/mobile/src/components/app-tabs.tsx`
- Modify: `apps/mobile/src/components/themed-text.tsx`
- Delete: `apps/mobile/src/app/trip/[id].tsx`

**Interfaces:** None — this task touches no shared types or function signatures other tasks depend on.

- [ ] **Step 1: Fix the "Explorar" tab icon**

In `apps/mobile/src/components/app-tabs.tsx`, the `explore` trigger currently reuses the home icon:

```tsx
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Explorar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
```

Change the `src` to the dedicated (already bundled, currently unused) explore icon:

```tsx
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Explorar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
```

- [ ] **Step 2: Fix `linkPrimary`'s hardcoded legacy color**

In `apps/mobile/src/components/themed-text.tsx`, the import currently reads:

```tsx
import { Fonts, ThemeColor } from '@/constants/theme';
```

Change it to also import `Brand`:

```tsx
import { Brand, Fonts, ThemeColor } from '@/constants/theme';
```

Then change the `linkPrimary` style from:

```tsx
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: '#F26B3A',
  },
```

to:

```tsx
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: Brand.coral,
  },
```

- [ ] **Step 3: Delete the dead `trip/[id]` route**

```bash
git rm "apps/mobile/src/app/trip/[id].tsx"
rmdir apps/mobile/src/app/trip 2>/dev/null || true
```

- [ ] **Step 4: Typecheck**

```bash
cd apps/mobile && npx tsc --noEmit
```

Expected: no errors related to `app-tabs.tsx`, `themed-text.tsx`, or the removed route. (Pre-existing unrelated errors, if any, are not this task's concern — note them but don't fix them here.)

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/app-tabs.tsx apps/mobile/src/components/themed-text.tsx
git commit -m "fix: correct Explorar tab icon, linkPrimary color, and remove dead trip route"
```

(The `git rm` from Step 3 stages the deletion automatically; it will be included in this commit.)

---

### Task 2: Reskin `chat.tsx` + set up visual verification preview

**Files:**
- Modify: `apps/mobile/src/app/chat.tsx`
- Create: `.claude/launch.json` (repo root — one-time setup, reused by later tasks)

**Interfaces:** None — purely visual edits within this file.

- [ ] **Step 1: Create the preview launch config (one-time, if it doesn't already exist)**

Check first: `cat .claude/launch.json 2>/dev/null`. If it doesn't exist, create it at the repo root:

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "mobile-web",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "web", "--workspace=apps/mobile"],
      "port": 8081
    }
  ]
}
```

This lets every subsequent visual-verification step use the Browser tool's `preview_start` with `name: "mobile-web"` instead of manually starting Expo.

- [ ] **Step 2: Import `Brand` in `chat.tsx`**

Current import:

```tsx
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
```

Change to:

```tsx
import { BottomTabInset, Brand, MaxContentWidth, Spacing } from '@/constants/theme';
```

- [ ] **Step 3: Recolor the agent avatar and traveler message bubble**

In the `MessageBubble` component, change:

```tsx
              ? { backgroundColor: '#183B4E' }
```

to:

```tsx
              ? { backgroundColor: Brand.navyDeep }
```

In `ChatScreen`'s header, change:

```tsx
            <View style={[styles.agentAvatar, { backgroundColor: '#183B4E' }]}>
```

to:

```tsx
            <View style={[styles.agentAvatar, { backgroundColor: Brand.navyDeep }]}>
```

- [ ] **Step 4: Recolor the send button and bump bubble radius**

Change:

```tsx
                  backgroundColor: inputText.trim()
                    ? pressed
                      ? '#DF5A2C'
                      : '#F26B3A'
                    : theme.backgroundSelected,
```

to:

```tsx
                  backgroundColor: inputText.trim()
                    ? pressed
                      ? '#D95638'
                      : Brand.coral
                    : theme.backgroundSelected,
```

In the `styles` object, change:

```tsx
  bubble: {
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
```

to:

```tsx
  bubble: {
    borderRadius: 18,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
```

- [ ] **Step 5: Give the empty-chat state an icon tile, matching the other screens' empty states**

Change:

```tsx
            {messages.length === 0 && (
              <View style={styles.emptyChat}>
                <ThemedText style={styles.emptyChatEmoji}>💬</ThemedText>
                <ThemedText style={styles.emptyChatText} themeColor="textSecondary">
                  {activeTrip ? 'Comece uma conversa com sua agência.' : 'Adicione uma viagem para acessar o suporte da agência.'}
                </ThemedText>
              </View>
            )}
```

to:

```tsx
            {messages.length === 0 && (
              <View style={styles.emptyChat}>
                <View style={[styles.emptyChatIconTile, { backgroundColor: theme.accentSoft }]}>
                  <ThemedText style={styles.emptyChatEmoji}>💬</ThemedText>
                </View>
                <ThemedText style={styles.emptyChatTitle}>Nenhuma mensagem ainda</ThemedText>
                <ThemedText style={styles.emptyChatText} themeColor="textSecondary">
                  {activeTrip ? 'Comece uma conversa com sua agência.' : 'Adicione uma viagem para acessar o suporte da agência.'}
                </ThemedText>
              </View>
            )}
```

Change the `emptyChat` and `emptyChatEmoji` styles and add two new ones. Replace:

```tsx
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: Spacing.two,
  },
  emptyChatEmoji: { fontSize: 48 },
  emptyChatText: { fontSize: 15, fontWeight: '500', textAlign: 'center' },
```

with:

```tsx
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: Spacing.two,
  },
  emptyChatIconTile: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyChatEmoji: { fontSize: 26 },
  emptyChatTitle: { fontSize: 16, fontWeight: '800', color: Brand.navyDeep },
  emptyChatText: { fontSize: 14, fontWeight: '500', textAlign: 'center', maxWidth: 260 },
```

- [ ] **Step 6: Typecheck**

```bash
cd apps/mobile && npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 7: Visually verify**

Use the Browser tool: `preview_start` with `name: "mobile-web"`, then navigate to the Chat tab. Confirm:
- Traveler bubbles and the agent avatar are dark navy (`#061D59`), not the old `#183B4E`.
- The send button is coral (`#FF6542`) when there's text to send.
- If there are no messages for the active trip, the empty state shows a soft-coral rounded icon tile above the bold title.

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/src/app/chat.tsx .claude/launch.json
git commit -m "style: unify chat.tsx colors and empty state with new brand style"
```

---

### Task 3: Reskin `diary.tsx`

**Files:**
- Modify: `apps/mobile/src/app/diary.tsx`

**Interfaces:** None — purely visual edits within this file.

- [ ] **Step 1: Import `Brand`**

Change:

```tsx
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
```

to:

```tsx
import { BottomTabInset, Brand, MaxContentWidth, Spacing } from '@/constants/theme';
```

- [ ] **Step 2: Add an eyebrow label above the header title**

Change:

```tsx
          <View>
            <ThemedText style={styles.headerTitle}>Diário</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {entries.length} {entries.length === 1 ? 'entrada' : 'entradas'}
            </ThemedText>
          </View>
```

to:

```tsx
          <View>
            <ThemedText style={styles.headerEyebrow}>SEU DIÁRIO</ThemedText>
            <ThemedText style={styles.headerTitle}>Diário</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {entries.length} {entries.length === 1 ? 'entrada' : 'entradas'}
            </ThemedText>
          </View>
```

- [ ] **Step 3: Restyle the header title, add the eyebrow style, and recolor the add button**

Change:

```tsx
  headerTitle: { fontSize: 22, fontWeight: '700' },
  addButton: {
    backgroundColor: '#F26B3A',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 8,
  },
```

to:

```tsx
  headerEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.4, color: Brand.coral, marginBottom: 4 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: Brand.navyDeep, letterSpacing: -0.6 },
  addButton: {
    backgroundColor: Brand.coral,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: 14,
  },
```

- [ ] **Step 4: Recolor the day badge, card radius, and "continuar lendo" link**

Change:

```tsx
  dayBadge: {
    backgroundColor: '#183B4E',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 4,
  },
```

to:

```tsx
  dayBadge: {
    backgroundColor: Brand.navyDeep,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 4,
  },
```

Change:

```tsx
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
```

to:

```tsx
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
```

Change:

```tsx
  expandText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#183B4E',
    marginTop: -4,
  },
```

to:

```tsx
  expandText: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.navyDeep,
    marginTop: -4,
  },
```

- [ ] **Step 5: Give the empty state an icon tile and bold title**

Change:

```tsx
          <View style={styles.empty}>
            <ThemedText style={styles.emptyEmoji}>📖</ThemedText>
            <ThemedText style={styles.emptyTitle} themeColor="textSecondary">
              Seu diário está vazio.
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptySubtitle}>
              Registre suas memórias, experiências e sentimentos desta viagem.
            </ThemedText>
            <Pressable
              onPress={() => setModalVisible(true)}
              style={styles.emptyAddBtn}
            >
              <ThemedText style={styles.emptyAddText}>Começar a escrever</ThemedText>
            </Pressable>
          </View>
```

to:

```tsx
          <View style={styles.empty}>
            <View style={[styles.emptyIconTile, { backgroundColor: theme.accentSoft }]}>
              <ThemedText style={styles.emptyEmoji}>📖</ThemedText>
            </View>
            <ThemedText style={styles.emptyTitle}>Seu diário está vazio.</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptySubtitle}>
              Registre suas memórias, experiências e sentimentos desta viagem.
            </ThemedText>
            <Pressable
              onPress={() => setModalVisible(true)}
              style={styles.emptyAddBtn}
            >
              <ThemedText style={styles.emptyAddText}>Começar a escrever</ThemedText>
            </Pressable>
          </View>
```

Change:

```tsx
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptySubtitle: { textAlign: 'center', lineHeight: 20 },
  emptyAddBtn: {
    backgroundColor: '#F26B3A',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 8,
    marginTop: Spacing.two,
  },
```

to:

```tsx
  emptyIconTile: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyEmoji: { fontSize: 26 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: Brand.navyDeep },
  emptySubtitle: { textAlign: 'center', lineHeight: 20 },
  emptyAddBtn: {
    backgroundColor: Brand.coral,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 14,
    marginTop: Spacing.two,
  },
```

- [ ] **Step 6: Restyle the "Nova Entrada" modal (radius, label color, inputs, actions)**

Change:

```tsx
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: Spacing.two },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#183B4E',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.two,
    fontSize: 14,
    marginBottom: Spacing.two,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.two,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: Spacing.three,
  },
  modalActions: { flexDirection: 'row', gap: Spacing.two },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.two,
    alignItems: 'center',
  },
  addBtn: {
    flex: 1,
    backgroundColor: '#F26B3A',
    borderRadius: 8,
    padding: Spacing.two,
    alignItems: 'center',
  },
```

to:

```tsx
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: Spacing.two, color: Brand.navyDeep },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: Brand.navyDeep,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.two,
    fontSize: 14,
    marginBottom: Spacing.two,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.two,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: Spacing.three,
  },
  modalActions: { flexDirection: 'row', gap: Spacing.two },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.two,
    alignItems: 'center',
  },
  addBtn: {
    flex: 1,
    backgroundColor: Brand.coral,
    borderRadius: 14,
    padding: Spacing.two,
    alignItems: 'center',
  },
```

- [ ] **Step 7: Typecheck**

```bash
cd apps/mobile && npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 8: Visually verify**

Use the Browser tool: `preview_start` with `name: "mobile-web"` (reuse the config from Task 2), navigate to Utilidades → Diário. Confirm:
- Header shows the coral eyebrow "SEU DIÁRIO" above a bold navy title.
- "+ Escrever" button is coral with a 14px radius.
- Cards have visibly larger corners than before.
- Open "Nova Entrada no Diário": the sheet has 24px top corners, navy labels, and a coral "Salvar" button.
- If there are no entries, the empty state shows a soft-coral icon tile.

- [ ] **Step 9: Commit**

```bash
git add apps/mobile/src/app/diary.tsx
git commit -m "style: unify diary.tsx with new brand style"
```

---

### Task 4: Reskin `expenses.tsx`

**Files:**
- Modify: `apps/mobile/src/app/expenses.tsx`

**Interfaces:** None — purely visual edits within this file.

- [ ] **Step 1: Import `Brand`**

Change:

```tsx
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
```

to:

```tsx
import { BottomTabInset, Brand, MaxContentWidth, Spacing } from '@/constants/theme';
```

- [ ] **Step 2: Add an eyebrow label above the header title**

Change:

```tsx
          <View>
            <ThemedText style={styles.headerTitle}>Despesas</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {expenses.length} {expenses.length === 1 ? 'item' : 'itens'}
            </ThemedText>
          </View>
```

to:

```tsx
          <View>
            <ThemedText style={styles.headerEyebrow}>SUAS DESPESAS</ThemedText>
            <ThemedText style={styles.headerTitle}>Despesas</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {expenses.length} {expenses.length === 1 ? 'item' : 'itens'}
            </ThemedText>
          </View>
```

- [ ] **Step 3: Restyle header title/eyebrow, add button, and total card**

Change:

```tsx
  headerTitle: { fontSize: 22, fontWeight: '700' },
  addButton: {
    backgroundColor: '#F26B3A',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 8,
  },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  totalCard: {
    backgroundColor: '#183B4E',
    marginHorizontal: Spacing.four,
    marginVertical: Spacing.three,
    borderRadius: 12,
    padding: Spacing.three,
  },
```

to:

```tsx
  headerEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.4, color: Brand.coral, marginBottom: 4 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: Brand.navyDeep, letterSpacing: -0.6 },
  addButton: {
    backgroundColor: Brand.coral,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: 14,
  },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  totalCard: {
    backgroundColor: Brand.navyDeep,
    marginHorizontal: Spacing.four,
    marginVertical: Spacing.three,
    borderRadius: 18,
    padding: Spacing.three,
  },
```

- [ ] **Step 4: Recolor category/currency chip selected state, section title, expense card radius and amount color**

Change (three occurrences of the selected-chip background/border and the section title / amount text — all currently `'#183B4E'`):

```tsx
                    backgroundColor:
                      category === cat.value ? '#183B4E' : theme.backgroundElement,
                    borderColor:
                      category === cat.value ? '#183B4E' : theme.backgroundSelected,
```

to:

```tsx
                    backgroundColor:
                      category === cat.value ? Brand.navyDeep : theme.backgroundElement,
                    borderColor:
                      category === cat.value ? Brand.navyDeep : theme.backgroundSelected,
```

Change:

```tsx
                  backgroundColor:
                    currency === cur ? '#183B4E' : theme.backgroundElement,
                  borderColor:
                    currency === cur ? '#183B4E' : theme.backgroundSelected,
```

to:

```tsx
                  backgroundColor:
                    currency === cur ? Brand.navyDeep : theme.backgroundElement,
                  borderColor:
                    currency === cur ? Brand.navyDeep : theme.backgroundSelected,
```

Change:

```tsx
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#183B4E' },
```

to:

```tsx
  sectionTitle: { fontSize: 13, fontWeight: '800', color: Brand.navyDeep },
```

Change:

```tsx
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 1,
    padding: Spacing.two + 4,
  },
```

to:

```tsx
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.two + 4,
  },
```

Change:

```tsx
  expenseAmount: { fontSize: 13, fontWeight: '800', color: '#183B4E' },
```

to:

```tsx
  expenseAmount: { fontSize: 13, fontWeight: '800', color: Brand.navyDeep },
```

- [ ] **Step 5: Give the empty state an icon tile**

Change:

```tsx
          <View style={styles.empty}>
            <ThemedText style={styles.emptyEmoji}>💸</ThemedText>
            <ThemedText style={styles.emptyText} themeColor="textSecondary">
              Nenhuma despesa registrada.
            </ThemedText>
            <Pressable
              onPress={() => setModalVisible(true)}
              style={styles.emptyAddBtn}
            >
              <ThemedText style={styles.emptyAddText}>Adicionar primeira despesa</ThemedText>
            </Pressable>
          </View>
```

to:

```tsx
          <View style={styles.empty}>
            <View style={[styles.emptyIconTile, { backgroundColor: theme.accentSoft }]}>
              <ThemedText style={styles.emptyEmoji}>💸</ThemedText>
            </View>
            <ThemedText style={styles.emptyText}>Nenhuma despesa registrada.</ThemedText>
            <Pressable
              onPress={() => setModalVisible(true)}
              style={styles.emptyAddBtn}
            >
              <ThemedText style={styles.emptyAddText}>Adicionar primeira despesa</ThemedText>
            </Pressable>
          </View>
```

Change:

```tsx
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptyAddBtn: {
    backgroundColor: '#F26B3A',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 8,
    marginTop: Spacing.two,
  },
```

to:

```tsx
  emptyIconTile: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyEmoji: { fontSize: 26 },
  emptyText: { fontSize: 17, fontWeight: '800', color: Brand.navyDeep },
  emptyAddBtn: {
    backgroundColor: Brand.coral,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 14,
    marginTop: Spacing.two,
  },
```

- [ ] **Step 6: Restyle the "Nova Despesa" modal (radius, label color, inputs, actions)**

Change:

```tsx
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: Spacing.two },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: '#183B4E' },
```

to:

```tsx
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: Spacing.two, color: Brand.navyDeep },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: Brand.navyDeep },
```

Change:

```tsx
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.two,
    fontSize: 14,
    marginBottom: Spacing.two,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginBottom: Spacing.three },
  currencyChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 6,
    borderWidth: 1,
  },
  currencyText: { fontSize: 12, fontWeight: '700' },
  amountInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.two,
    fontSize: 14,
  },
  modalActions: { flexDirection: 'row', gap: Spacing.two },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.two,
    alignItems: 'center',
  },
  addBtn: {
    flex: 1,
    backgroundColor: '#F26B3A',
    borderRadius: 8,
    padding: Spacing.two,
    alignItems: 'center',
  },
```

to:

```tsx
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.two,
    fontSize: 14,
    marginBottom: Spacing.two,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginBottom: Spacing.three },
  currencyChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 10,
    borderWidth: 1,
  },
  currencyText: { fontSize: 12, fontWeight: '700' },
  amountInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.two,
    fontSize: 14,
  },
  modalActions: { flexDirection: 'row', gap: Spacing.two },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.two,
    alignItems: 'center',
  },
  addBtn: {
    flex: 1,
    backgroundColor: Brand.coral,
    borderRadius: 14,
    padding: Spacing.two,
    alignItems: 'center',
  },
```

- [ ] **Step 7: Typecheck**

```bash
cd apps/mobile && npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 8: Visually verify**

Use the Browser tool: `preview_start` with `name: "mobile-web"`, navigate to Utilidades → Despesas. Confirm:
- Header shows the coral eyebrow "SUAS DESPESAS" above a bold navy title.
- Total card is dark navy (`#061D59`) with 18px corners.
- Selected category/currency chips are dark navy.
- Expense cards have visibly larger (18px) corners.
- Open "Nova Despesa": the sheet has 24px top corners, navy labels, coral "Adicionar" button.
- If there are no expenses, the empty state shows a soft-coral icon tile.

- [ ] **Step 9: Commit**

```bash
git add apps/mobile/src/app/expenses.tsx
git commit -m "style: unify expenses.tsx with new brand style"
```

---

### Task 5: Reskin `documents.tsx`

**Files:**
- Modify: `apps/mobile/src/app/documents.tsx`

**Interfaces:** None — purely visual edits within this file.

- [ ] **Step 1: Import `Brand`**

Change:

```tsx
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
```

to:

```tsx
import { BottomTabInset, Brand, MaxContentWidth, Spacing } from "@/constants/theme";
```

- [ ] **Step 2: Add an eyebrow label above the header title**

Change:

```tsx
        <ThemedView style={[styles.header, { borderBottomColor: theme.backgroundSelected }]}>
          <ThemedText style={styles.headerTitle}>Documentos</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {documents.length} {documents.length === 1 ? "arquivo" : "arquivos"}
          </ThemedText>
        </ThemedView>
```

to:

```tsx
        <ThemedView style={[styles.header, { borderBottomColor: theme.backgroundSelected }]}>
          <ThemedText style={styles.headerEyebrow}>SEUS ARQUIVOS</ThemedText>
          <ThemedText style={styles.headerTitle}>Documentos</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {documents.length} {documents.length === 1 ? "arquivo" : "arquivos"}
          </ThemedText>
        </ThemedView>
```

Note the header in this file is a single column (no row with a button), so remove `flexDirection`/`justifyContent` from the `header` style since it's no longer needed for a two-column layout — change:

```tsx
  header: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
```

to:

```tsx
  header: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  headerEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.4, color: Brand.coral, marginBottom: 4 },
  headerTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: Brand.navyDeep,
    letterSpacing: -0.6,
  },
```

- [ ] **Step 3: Recolor the section title / trip badge and the "Abrir documento" button**

Change:

```tsx
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#183B4E",
    marginBottom: Spacing.one,
  },
```

to:

```tsx
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: Brand.navyDeep,
    marginBottom: Spacing.one,
  },
```

Change:

```tsx
  tripBadge: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    color: "#183B4E",
    letterSpacing: 0.6,
  },
```

to:

```tsx
  tripBadge: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    color: Brand.navyDeep,
    letterSpacing: 0.6,
  },
```

Change:

```tsx
      <Pressable
        onPress={handleOpen}
        style={({ pressed }) => [
          styles.openButton,
          { backgroundColor: pressed ? "#DF5A2C" : "#F26B3A", opacity: pressed ? 0.92 : 1 },
        ]}
      >
```

to:

```tsx
      <Pressable
        onPress={handleOpen}
        style={({ pressed }) => [
          styles.openButton,
          { backgroundColor: pressed ? "#D95638" : Brand.coral, opacity: pressed ? 0.92 : 1 },
        ]}
      >
```

- [ ] **Step 4: Increase card radius**

Change:

```tsx
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
```

to:

```tsx
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
```

- [ ] **Step 5: Give the empty and loading states an icon tile**

Change:

```tsx
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#F26B3A" />
            <ThemedText style={styles.loadingText} themeColor="textSecondary">
              Carregando documentos das suas viagens...
            </ThemedText>
          </View>
        ) : documents.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText style={styles.emptyEmoji}>📂</ThemedText>
            <ThemedText style={styles.emptyText} themeColor="textSecondary">
              Nenhum documento disponível ainda.
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Quando sua agência anexar arquivos à viagem, eles aparecerão aqui.
            </ThemedText>
          </View>
        ) : (
```

to:

```tsx
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={Brand.coral} />
            <ThemedText style={styles.loadingText} themeColor="textSecondary">
              Carregando documentos das suas viagens...
            </ThemedText>
          </View>
        ) : documents.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIconTile, { backgroundColor: theme.accentSoft }]}>
              <ThemedText style={styles.emptyEmoji}>📂</ThemedText>
            </View>
            <ThemedText style={styles.emptyText}>Nenhum documento disponível ainda.</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Quando sua agência anexar arquivos à viagem, eles aparecerão aqui.
            </ThemedText>
          </View>
        ) : (
```

Change:

```tsx
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600" },
```

to:

```tsx
  emptyIconTile: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyEmoji: { fontSize: 26 },
  emptyText: { fontSize: 17, fontWeight: "800", color: Brand.navyDeep },
```

- [ ] **Step 6: Typecheck**

```bash
cd apps/mobile && npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 7: Visually verify**

Use the Browser tool: `preview_start` with `name: "mobile-web"`, navigate to the Documentos tab. Confirm:
- Header shows the coral eyebrow "SEUS ARQUIVOS" above a bold navy title, stacked in a single column (no more title/count on one row).
- Document cards have 18px corners.
- "Abrir documento" / "Ver documento" button is coral.
- Section titles and trip badges are dark navy.
- If there are no documents, the empty state shows a soft-coral icon tile.
- PDF/image type badges are unchanged (still red/blue, not brand colors).

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/src/app/documents.tsx
git commit -m "style: unify documents.tsx with new brand style"
```

---

## Self-Review Notes

- **Spec coverage:** All 4 screens from the spec's "Per-file changes" section have a task (Tasks 2-5). The two bugs and the dead-code removal have a task (Task 1). Verification approach (manual, screen-by-screen, browser preview, tsc) is reflected in every task's steps.
- **Placeholder scan:** No "TBD"/"add appropriate styling" — every step shows the literal before/after code.
- **Type consistency:** `Brand`, `theme.accentSoft`, and the fixed radius/color literals (`18`, `14`, `24`, `Brand.navyDeep`, `Brand.coral`, `#D95638`) are used identically across all 4 reskin tasks.
