# Proposal: command-palette

## Summary

Anchor a Ctrl/Cmd+K command palette ONCE in `@conduction/nextcloud-vue` so
every consuming app inherits it, instead of each app hand-rolling (or, more
realistically, never building) keyboard-first navigation. Ships
`CnCommandPalette` — a modal, keyboard-only, WAI-ARIA-combobox command
palette that aggregates three pluggable sources (navigation from
`manifest.menu`, app-registered actions, and live OpenRegister object
search) into one ranked, sectioned result list — plus the registration API
(`useCommandPalette`), the ranking engine, and a ready-made object-search
adapter (`createObjectSearchSource`). Opt-in via `CnAppRoot`'s
`commandPalette` prop, default off.

## Motivation

A procest research audit finding reads: "no Nextcloud unified-search
provider **or command palette**; keyboard shortcuts only." The
unified-search half was already solved fleet-wide via OpenRegister's
`ObjectsProvider`. The command-palette half was still missing everywhere —
13+ apps would each need to build a modal, a ranking algorithm, keyboard
handling, and ARIA wiring from scratch, or (more likely) skip it, leaving
every app mouse-first for anything beyond the unified-search box.

This is a cross-cutting UI capability, not app logic — exactly the shape
`wcag-a11y-anchor` (#220) anchored for accessibility testing: build it once
in the shared library, apps inherit it near-for-free, apps that need
customization (a bespoke object source, extra registered commands) extend
through a small seam instead of forking.

## What ships

- **`CnCommandPalette`** (`src/components/CnCommandPalette/`) — the modal
  component. Opens on Ctrl/Cmd+K (configurable shortcut key, disable-able
  global listener), closes on Escape, keyboard-only Up/Down/Enter
  navigation via `aria-activedescendant` (focus never leaves the input).
  Built on the real `NcDialog` for focus-trap/restore/backdrop-close.
- **`useCommandPalette()`** (`src/composables/useCommandPalette.js`) — the
  public registration API: `register({id, title, section, keywords, icon,
  run})` / `unregister(id)`, plus `open()`/`close()`/`toggle()` over a
  shared, app-wide open/close state.
- **`createObjectSearchSource()`**
  (`src/utils/commandPaletteObjectSource.js`) — a ready-made adapter that
  wraps `useObjectStore().fetchCollection(type, {_search, _limit})` (the
  SAME search mechanism `CnIndexPage`/`CnSearchPage` already use) into a
  debounced, stale-result-discarding source for the palette's
  `objectSearch` prop.
- **Ranking engine** (`src/utils/commandPaletteRanking.js`, internal) —
  pure, dependency-free scoring: exact-prefix > word-prefix >
  fuzzy-subsequence, sectioned, with a bounded optional recency/frequency
  boost (local-only, `localStorage`, never able to promote a lower tier
  over a higher one).
- **`CnAppRoot` opt-in mount** — a new `commandPalette` prop
  (`Boolean|Object`, default `false`, mirroring the `aiCompanion` /
  `supportDialog` convention) that auto-mounts the palette wired to
  `manifest` + `$router` + `appId` with zero further app code; pass an
  object to override any `CnCommandPalette` prop (most commonly to wire
  `objectSearch`).

## What does NOT ship

- Cross-device / server-side recency sync (documented follow-up — the
  boost is `localStorage`-only, matching `CnSupportDialog`'s own fallback
  tier).
- A generic "open this object" navigation default for the objects source —
  the app supplies `resolveResult` (or `resolveManifestDetailRoute` for the
  conventional manifest-driven detail-page case) because how an app opens
  an object (a dedicated page, a sidebar, a modal) is app-specific.
- No new runtime dependencies. No `npm publish` (this is a nc-vue beta
  merge only, consumed by apps on their next lib bump).

## Impact

- Affected: `@conduction/nextcloud-vue` only. No consuming app's manifest,
  API, or default behaviour changes — the palette is fully opt-in
  (`commandPalette: false` by default).
- Non-breaking: additive component + composable + utility exports, one new
  optional `CnAppRoot` prop.
