# Design: command-palette

## Source model

The palette aggregates three independent, pluggable "sources" into one
ranked list. Each source contributes candidate items shaped
`{id, title, section?, keywords?, icon?, subtitle?, run}` — `run()` is the
one contract every source honours, so the palette's keyboard/click
activation code never branches on source kind.

| Source | Built from | Computed | Contributed by |
|--------|-----------|----------|-----------------|
| navigation | `manifest.menu` (flattened, one level of `children`, captions excluded) | synchronously, client-side, on every keystroke | `CnCommandPalette` itself, zero app code |
| actions | `useCommandPalette().register(...)` calls | synchronously, client-side | the consuming app, declaratively |
| objects | `objectSearch(query)` prop — typically `createObjectSearchSource({store, types, ...})` | asynchronously, debounced, server-side filtered | the consuming app, opt-in |

Navigation and actions are ranked **strictly** — a candidate that matches
none of the query's tiers is dropped, because the full candidate set is
known locally and false negatives from the scorer would just be a scorer
bug. Objects are ranked with `includeNonMatching: true` — the server
already filtered them (`_search` may match a field, like a description,
that the client-side scorer never inspects), so a client-side "no tier
match" must not silently vanish a legitimate server match; it's appended
after every real match instead of dropped.

### Why not a single unified source interface with a `search()` method?

Navigation and actions are small, static, and synchronous — the palette
already holds the full list every keystroke. Wrapping them in an async
`search()` contract just to unify with objects would force every
keystroke through a microtask/debounce for no benefit, and would make the
"navigation/actions render instantly, objects pop in later" requirement
(never block the palette on network) harder to guarantee rather than
easier. Two synchronous computed properties (`navigationItems`,
`commandItems`) plus one async `objectSearch` prop is the simplest shape
that satisfies "never blocks."

## Ranking

`src/utils/commandPaletteRanking.js` — pure, dependency-free, unit-tested
in isolation from Vue/DOM/network (`tests/utils/commandPaletteRanking.spec.js`,
19 assertions covering the tier matrix, ties, keyword matches, the
`includeNonMatching` escape hatch, and the recency boost's tier-safety
bound).

Three tiers, evaluated per candidate field (title first, then each
keyword — keywords penalised 0.85× so a title match always wins a
same-tier tie against a keyword match):

1. **EXACT** — the field equals the query, or the query is a prefix of the
   whole field. Shorter fields with the same prefix score slightly higher
   (`"Open"` outranks `"Open dashboard settings"` for query `"open"`).
2. **WORD_PREFIX** — the query is a prefix of one of the field's individual
   words (split on non-alphanumeric runs), so `"dash"` matches `"Open
   Dashboard"` via its second word.
3. **FUZZY** — every query character appears, in order, as a subsequence of
   the field. Scored by compactness (shorter match span), longest
   contiguous run, and how early the match starts — so `"cp"` against two
   fuzzy candidates never ties arbitrarily.

Tier gaps (300+ score points) are far larger than any within-tier
adjustment (keyword penalty, recency boost capped at 20), so a lower tier
can never outrank a higher one regardless of recency/frequency. Sections
are grouped after ranking, ordered by their best (first, since input is
pre-sorted) entry's score; entries keep their rank order within a section.

### Recency/frequency boost (optional, local-only)

`src/commandPalette/recency.js` persists a per-app, per-item use-count map
to `localStorage` (namespaced `cn-command-palette-recency:<appId>`,
capped at 200 tracked ids, least-used evicted first). `appId` is required
to enable it — omitting it disables the boost entirely (ranking still
works correctly by tier, just without a "used recently" nudge).

This stops short of cross-device sync deliberately: that would need a
server endpoint (mirroring `CnSupportDialog`'s
`/api/preferences/support-dialog-seen` pattern) which is real app-side
infrastructure, not a shared-library concern. The `localStorage`-only tier
is documented as the shipped behaviour, with server sync noted as a
legitimate follow-up in `docs/components/cn-command-palette.md`.

## Adoption path

**Zero code** (navigation only): nothing — pass `command-palette="true"` to
`CnAppRoot`. Every `manifest.menu` entry becomes a "jump to page" result.

**One composable call** (add actions): from any component,

```js
useCommandPalette().register({ id, title, run: () => ... })
```

in `mounted()`, unregistered in `beforeDestroy()`. Actions registered by
ANY component in the app tree merge into the SAME palette (shared, module-
level registry singleton) — a toolbar button and a detail-page component
can both contribute commands without knowing about each other.

**One factory call** (add live object search):

```js
commandPalette: {
  objectSearch: createObjectSearchSource({ store: useObjectStore(), types: [...], resolveResult, router }),
}
```

on the `CnAppRoot` `commandPalette` prop's object form. `resolveResult`
is the one place app-specific navigation semantics live — the library
does not assume how an app opens an object (dedicated page vs. sidebar vs.
modal); `resolveManifestDetailRoute` is offered as a ready building block
for the conventional manifest-driven detail-page case.

**Standalone mount**: any app can mount `<CnCommandPalette>` directly
instead of going through `CnAppRoot`, for finer control over placement or
when the app doesn't use `CnAppRoot` at all.

## Orphaned-capability guard

Per the fleet's orphaned-capability defect class (spec-says-done ≠
feature-runs): `tests/components/CnAppRoot/CnAppRoot.commandPalette` (folded
into `tests/components/CnAppRoot.spec.js`'s "Command palette opt-in"
describe block) proves the opt-in prop actually renders `CnCommandPalette`
wired to `manifest`/`appId`/prop overrides when enabled, and proves it does
NOT render by default — so enabling the capability is verified to have an
observable effect, not just a passing unit test on the component in
isolation.

## Accessibility

Built on the real `NcDialog` for `role="dialog"`, `aria-modal`, focus trap,
and Escape/backdrop-close (inherited "for free," the same reasoning
`CnConfirmDialog` documents for wrapping `NcDialog` rather than hand-rolling
a modal). Inside it, a hand-authored WAI-ARIA 1.2 combobox pattern:
`role="combobox"` input with `aria-autocomplete="list"`, `aria-expanded`,
`aria-controls` pointing at the `role="listbox"`, and `aria-activedescendant`
pointing at the active `role="option"` row — focus stays in the text input
the whole time (contrast with `CnTimelineStages`' roving-tabindex pattern,
which moves DOM focus onto each item; right for a widget the user tabs
INTO, wrong for a searchable palette). A visually-hidden `aria-live="polite"`
region announces the result count on every keystroke.

Verified with `expectAccessible()` (the `wcag-a11y-anchor` primitive) in
three states: open/idle (empty query), results (query with matches, several
sections), and empty-results — `tests/a11y/CnCommandPalette.a11y.spec.js`,
3 assertions, all green with zero WCAG 2.1 AA violations on the first pass.
Uses only Nextcloud CSS variables (`--color-*`, `--border-radius`), so it
renders correctly in both light and dark theme with no hardcoded colours.
