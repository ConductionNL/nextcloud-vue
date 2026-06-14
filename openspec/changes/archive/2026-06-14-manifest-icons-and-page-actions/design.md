# Design — manifest icons + page-level header actions

## Decision context

Two issues filed against the manifest renderer (`ConductionNL/nextcloud-vue#324` and `#325`) both stem from manifest authors needing to declare presentational and interactive surface that the primitives already render but the wrappers/dispatchers do not forward. Both are narrow fixes — neither introduces a new component, both extend existing ones.

The user-supplied scope picked the lighter-weight option for #324 (CSS class only, no MDI dynamic import) and the existing handler-dispatch pattern for #325 (mirror `config.actions[]` rather than invent a new mechanism). This design document records the concrete API decisions inside that scope.

## Decision 1 — `iconClass` shape

**Decision:** Add `iconClass: String` (default `''`) as a new top-level prop on `CnStatsBlockWidget` and render a wrapping `<div :class="['cn-stats-block-widget', iconClass]">`.

**Alternatives considered:**

- **A. Forward as a class on the underlying `CnStatsBlock`.** Would require either a new class-binding prop on `CnStatsBlock` (touches a primitive used outside dashboards) or relying on `$attrs` inheritance (CnStatsBlock has `inheritAttrs: false` semantics in some paths). Rejected — the wrapping `<div>` is one extra DOM node and isolates the change to the widget wrapper.
- **B. Wire `iconClass` into `CnStatsBlock`'s existing `icon: Component` prop.** Would mean converting a string class name into a tiny Vue render function that emits `<span :class="iconClass" />`. Doable but conflates two API surfaces (component vs CSS class). Rejected — keeps the primitive's `icon: Component` contract clean.
- **C. Render a separate `<span class="cn-stats-block-widget__icon" :class="iconClass">` inside the slot.** Requires a `CnStatsBlock` slot, which doesn't exist for the icon (only the component prop). Rejected — would mean changes to the primitive as well.

**Why a wrapping div is acceptable:**

- The Nextcloud icon-* classes are square-glyph CSS classes set on a generic element (`<span class="icon-link" />`), so they work fine on a `<div>` wrapper that has no flex/grid layout of its own.
- The new wrapper has no styles in our CSS (no padding, no border, no display change) so the rendered box is identical to the bare `<CnStatsBlock>` it used to mount.
- The class binding is a no-op when `iconClass=''` (Vue's class array collapses empty strings).

**Rejected scope:** `iconName: 'Database'` MDI dynamic-import. Heavier (async chunk, MDI library wiring) and the consumer pressure (openconnector#831) only needs CSS classes that NC already ships. Tracked as a follow-up in the Deferred section.

## Decision 2 — `headerActions` shape mirrors row-level `actions`

**Decision:** `config.headerActions[]` uses the **same `action` $def** as the row-level `config.actions[]` — `{ id, label, icon, handler, route, type, target, props }`. The only behavioural difference is what `handler` is called with:

| Handler keyword | Row-level (`actions[]`) | Page-level (`headerActions[]`) |
| --- | --- | --- |
| `navigate` | `$router.push({ name: route, params: { id: row[rowKey] } })` | `$router.push({ name: route })` (no row context) |
| `emit` | re-emits `@action({ action: label, row })` | re-emits `@header-action({ action: id, id })` |
| `none` | no-op + suppresses `@action` emit | no-op + suppresses `@header-action` emit |
| registry name | `fn({ actionId, item: row })` | `fn({ actionId })` |

**Why mirror the row-level shape:**

- Consumers already know it (it's in `manifest-actions-dispatch` archived spec).
- Same JSON schema $def — schema diff is one new property pointing at the existing `$ref: "#/$defs/action"`.
- Same `resolveHandler()` plumbing in CnIndexPage — we reuse the existing computed pattern with a header-specific variant that skips the `params.id` bit.

**Alternative considered:** Invent a new flatter shape `{ id, label, icon, route?, emit? }`. Rejected — fragments the mental model, and consumers asked explicitly for handler-registry parity.

## Decision 3 — Where header actions render inside CnActionsBar

**Decision:** Inside the existing `NcActions` overflow dropdown, **after** the built-in Refresh `NcActionButton`, **before** the existing `#action-items` slot. Order in the dropdown becomes:

1. Refresh (built-in)
2. `headerActions[]` items (new — declarative)
3. `#action-items` slot content (existing — imperative)
4. Separator (existing, if mass actions present)
5. Mass Import / Export / Copy / Delete (built-ins, gated by show* props)
6. `#mass-actions` slot content (existing)

**Why this ordering:**

- Refresh remains primary (most-used).
- Declarative `headerActions[]` go before the imperative `#action-items` slot so a consumer mixing both knows manifest-declared items appear first.
- Mass actions stay grouped at the bottom (after a separator) — the existing layout that consumers expect.

**Alternative considered:** Render `headerActions[]` *outside* the `NcActions` dropdown as inline buttons next to Add. Rejected — visually competes with Add (the page's primary CTA) and would force every page to negotiate inline-action spacing.

## Decision 4 — Reserved-id collision handling

**Decision:** `headerActions[]` entries whose `id` matches a reserved built-in id (`refresh`, `import`, `export`, `copy`, `delete`) are silently dropped at the `mergedHeaderActions` computed with a `console.warn`. Built-ins always win.

**Why:** Future-proofs against manifest authors discovering a built-in by accident. Logging keeps the bug visible during development without breaking the page.

## Decision 5 — Event naming

**Decision:** The new emit is `@header-action`, payload `{ action: <id>, id: <id> }`. The `action` field is the action's `id` (not its `label` like the row-level `@action`); `id` is duplicated for forward-compat (a future shape change may drop the `action` alias).

**Why:** Row-level `@action` uses `label` for legacy reasons (CnRowActions emits by label). Header-level is a fresh API so we use the stable `id` field. The duplicate `id` key makes consumer code `payload.id` work today AND survive a future deprecation of `payload.action`.

## Test strategy

- **CnStatsBlockWidget unit test** — mount with `iconClass: 'icon-link'`, assert the rendered DOM has a wrapper `<div>` carrying both `cn-stats-block-widget` and `icon-link` classes; mount without to assert the wrapper still renders but with only the base class.
- **CnDashboardPage unit test** — call `getStatsBlockProps(item)` with a widgetDef containing `props.iconClass: 'icon-link'`; assert the returned object has `iconClass: 'icon-link'`.
- **CnIndexPage unit test** — mount with `config.headerActions: [{ id: 'view-logs', label: 'View logs', handler: 'navigate', route: 'SourceLogs' }]`; assert the rendered CnActionsBar receives the action in its `headerActions` prop AND that clicking it triggers `$router.push({ name: 'SourceLogs' })`. Variants: `handler: 'emit'` triggers `@header-action`; `handler: 'none'` is silent; reserved `id: 'refresh'` is dropped + warned.
- **CnActionsBar unit test** — mount with `headerActions: [{ id: 'x', label: 'X', icon: 'icon-link' }]`; open the NcActions menu; assert an NcActionButton labelled "X" is rendered between Refresh and `#action-items`.

## Deferred

- **MDI icon support on `CnStatsBlockWidget` via `iconName: 'Database'`.** A new issue covers the async-chunk wiring; not in scope here.
- **Page-level `actionToggles` extension to disable built-ins via header-action ids.** Out of scope — the existing `actionToggles` map already handles built-in disablement.
- **Inline (non-overflow) rendering of header actions.** Some consumers may want a critical header action rendered as an inline button (not inside the NcActions overflow). Deferred — needs UX validation, not unblocked by current consumer pressure.
- **Reusable `mergeHeaderActions` composable.** If a second page type (e.g. CnDetailPage) also gains `config.headerActions[]`, the dispatcher logic should move into a composable. Tracked as a follow-up.
