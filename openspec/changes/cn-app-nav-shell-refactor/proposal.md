## Why

The manifest-driven app shell (`CnAppRoot` + `CnAppNav` + `CnPageRenderer` + `CnWidgetWrapper`) is now in every Conduction Nextcloud app, but its NC-native sidebar pattern is missing several conventions every host app re-implements by hand: bottom-anchored "always visible" links (Docs / Features / About) sit in the same scrollable list as feature pages, the user-settings entry is a footer link instead of NC's gear-icon foldout (`NcAppNavigationSettings`), there is no "+ New" primary action above the list, and there are no counter badges next to entries. At the same time three concrete bugs are blocking host pages: `CnPageRenderer` swallows widget events because it does not forward `$listeners` / `$attrs` to the dispatched page component (B1), `CnWidgetWrapper`'s built-in "Refresh" and "Request a feature" actions do nothing unless the host wires them per-widget (B2), and there is no documented contract for how a widget actually responds to a Refresh click (B3). Doing all of this in one refactor — one PR, one set of JSDoc/doc updates, one round of consumer-app migrations — costs the fleet less than five small piecemeal PRs.

## What Changes

- **Three-section menu model.** Manifest `menu[].section` becomes a 3-value enum:
  - `section: "main"` (default, unchanged) — scrollable top list.
  - `section: "footer"` (NEW) — pinned-bottom **regular** `NcAppNavigationItem`s, rendered inside the existing `NcAppNavigation` `#footer` slot, above the settings foldout. Used for Documentation, Features & Roadmap, About — items that should be always visible but are not user/app settings.
  - `section: "settings"` (REPURPOSED — see Impact / backwards-compat note below) — items now render INSIDE an auto-mounted `NcAppNavigationSettings` foldout (gear-icon button + slide-down panel), not as plain `#footer` entries. The foldout **auto-prepends** a "Personal settings" entry that opens the existing `NcAppSettingsDialog` modal via `cnOpenUserSettings` provide/inject.
- **Primary action above list.** New optional manifest field `primaryAction` on either a `page` (active-page-scoped) or the menu root (app-wide default). When set, `CnAppNav` renders an `NcAppNavigationNew` button ("+ New X") above the menu list. The click emits a `@primary-action` event the host app handles (typically opens the same create dialog `CnIndexPage`'s create flow uses).
- **Per-item counter badges.** New optional manifest field `count` on a menu item. `CnAppNav` renders `NcCounterBubble` in `NcAppNavigationItem`'s `#counter` slot. Two binding modes:
  - **Literal** number from the manifest.
  - **Reactive auto-bind**: when an entry's `route` resolves to a page with `type: "index"` and a `register/schema` config, `CnAppRoot` pre-loads totals via `useObjectStore` at app boot and binds the badge from the store's index response `total` field. No extra round-trip — the index page reuses the same store entry when the user opens it.
- **B1 — `CnPageRenderer` $listeners/$attrs forwarding.** The dispatched page component MUST receive `v-on="$listeners"` and `v-bind="$attrs"` (in addition to the explicit `:is`, `:key`, `v-bind="resolvedProps"`) so widget events emitted by dashboard pages (and any other downstream emits) surface to the host App component.
- **B2 — `CnWidgetWrapper` default-action wiring.** Refresh and Request-a-feature no longer require host listeners to be useful. Built-in defaults:
  - **Request a feature**: opens `CnSuggestFeatureModal` directly with `app + page + surface` auto-filled from `CnAppRoot` inject + the active `$route.name` + the widget id. Host app can still listen to `@request-feature` to override.
  - **Refresh**: emits on `@nextcloud/event-bus` channel `cn:widget:refresh` with payload `{ widgetId }`. Host app can still listen to `@refresh` to override.
- **B3 — Widget Refresh opt-in contract (DOCUMENTED).** Widgets opt in to refresh by ONE OF:
  - Accepting a `refreshTrigger` reactive prop (`Number`/timestamp) and watching it; OR
  - Exposing a ref-callable `refresh()` method (canonical recommendation); OR
  - Subscribing to the `cn:widget:refresh` event-bus channel and filtering by `widgetId`.
  All three patterns documented in `CnWidgetWrapper.md` with code examples.
- **Smaller surface gaps (bundled because they live in the same template):**
  - Nested `children[]` rendering with `allowCollapse + open` (the filter already exists in `CnAppNav.visibleChildren`; the template now wires `:allow-collapse` + `:open` on the parent `NcAppNavigationItem`).
  - `#search` slot pass-through for `NcAppNavigationSearch`.
  - Per-item `#actions` slot pass-through for inline `NcActions` menus.
  - Per-item `pinned: true` manifest field → `NcAppNavigationItem`'s `pinned` prop.
  - `type: "caption"` menu entry → renders as `NcAppNavigationCaption` (section dividers).
- **JSDoc / docs site updates.** Every new prop, event, slot, and manifest field gets full JSDoc on its SFC. `docs/components/_generated/` regenerated. `cn-app-nav.md`, `cn-page-renderer.md`, `cn-widget-wrapper.md`, `cn-app-root.md` and the JSDoc baseline file all updated.

### Out of scope (file separately)

- Fleet rollout to the 11 consuming apps' manifests (one PR per app to opt into `section: "footer"` / `primaryAction` / `count`).
- Adding actual `NcAppSettingsDialog` mounts to apps that don't already have one wired through `cnOpenUserSettings`.

## Capabilities

### New Capabilities

- `app-nav-shell`: Manifest-driven `CnAppNav` rendering rules — the three-section model (`main` / `footer` / `settings`), the `NcAppNavigationSettings` foldout with auto-prepended Personal-settings entry, the `NcAppNavigationNew` primary-action wiring, `NcCounterBubble` badge binding (literal + store-reactive), nested children rendering, search-slot pass-through, per-item actions slot pass-through, `pinned` field, and `type: "caption"` entries.
- `widget-wrapper-actions`: `CnWidgetWrapper` built-in action defaults — the default Request-a-feature handler that opens `CnSuggestFeatureModal` with auto-filled context, the default Refresh handler that emits on the `cn:widget:refresh` event-bus channel, and the documented widget refresh opt-in contract (`refreshTrigger` prop / `refresh()` method / event-bus subscription).

### Modified Capabilities

- `widget-wrapper`: An existing requirement (`header actions slot`) covers the overflow `…` menu that hosts Refresh and Request-a-feature. The default click-handler behaviour (previously: emit-only, host app handles) changes to opt-out defaults (event-bus + auto-mounted modal). The events themselves are still emitted so existing listeners still win. The delta MODIFIES the `header actions slot` requirement to document the built-in defaults and ADDS new requirements for the refresh contract and the Suggest-feature default.

(B1 — `CnPageRenderer` `$listeners`/`$attrs` forwarding — is a single-line behavioural fix inside a component that has no existing capability spec; it is folded into the `app-nav-shell` delta as a renderer-side requirement so reviewers don't chase a phantom new spec file. The `CnAppRoot` provide-chain addition is an internal documentation-only update covered by the same `app-nav-shell` capability — no separate `cn-app-root` spec edit is required.)

## Impact

- **Affected components:** `CnAppNav.vue`, `CnPageRenderer.vue`, `CnWidgetWrapper.vue`, `CnAppRoot.vue` (provide chain only). No other component touched.
- **Affected consumers:** All five fleet consumers (OpenRegister, OpenCatalogi, Procest, Pipelinq, MyDash) plus six pre-prod fleet apps (decidesk, docudesk, larpingapp, softwarecatalog, zaakafhandelapp, mydash) — every host already mounts `CnAppRoot` so they automatically inherit the new defaults; no host changes required to keep current behaviour.
- **Backwards-compatibility — VISUAL CHANGE on `section: "settings"`.** Any manifest entry currently using `section: "settings"` will now render INSIDE the `NcAppNavigationSettings` gear-icon foldout instead of as a plain pinned `#footer` entry. This is intentional — it IS the corrected NC-native pattern — but it is a visible UX change for those entries. Hosts that want the old pinned-bottom plain-link behaviour should rename `section: "settings"` → `section: "footer"`. Documented in `cn-app-nav.md` and the migration guide.
- **Backwards-compatibility — API.** No props removed. No events removed. No slots removed. All new props/events/slots have safe defaults. Existing `section: "settings"` items keep working (they just relocate visually). Host listeners on `@refresh` / `@request-feature` keep winning over the new defaults.
- **JSON Manifest Schema** (`src/schemas/app-manifest.schema.json` and any V2 schema): add `section: "footer"`, `count` (number), `pinned` (boolean), `type: "caption"` to the menu-item subschema; add `primaryAction` to the page subschema and the menu root. `validateManifest` must accept the new fields.
- **Tests.** All existing `CnAppNav.spec.js` / `CnPageRenderer.spec.js` / `CnWidgetWrapper.spec.js` tests must continue to pass. New cases added for: settings-foldout mounting, footer-section rendering, primary-action emit, counter-badge binding modes, B1 listener forwarding, B2 default action wiring, B3 documented refresh modes, captions, pinned, search slot, per-item actions slot.
- **Docs.** `docs/components/cn-app-nav.md`, `cn-page-renderer.md`, `cn-widget-wrapper.md`, `cn-app-root.md`, `docs/components/_generated/*` partials, `scripts/.jsdoc-baselines.json`, plus `docs/migrating-to-manifest.md` updated with a "Section model" subsection. `npm run check:docs` and `npm run check:jsdoc` must stay green.
- **Theming.** New components imported from `@nextcloud/vue` (`NcAppNavigationSettings`, `NcAppNavigationNew`, `NcCounterBubble`, `NcAppNavigationCaption`, `NcAppNavigationSearch`) all consume Nextcloud CSS variables natively. No `--nldesign-*` references introduced.
