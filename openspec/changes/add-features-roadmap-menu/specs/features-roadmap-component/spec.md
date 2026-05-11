---
status: proposed
capability: features-roadmap-component
---

# Features & Roadmap component family

## Purpose

Defines the behaviour of the six-component family + composable + helper + two exported constants that together render a Features & Roadmap surface inside any Conduction Nextcloud app's settings navigation. Consumes the `github-issue-proxy` API exposed by `openregister` (spec: `openregister/openspec/changes/add-features-roadmap-menu/specs/github-issue-proxy/spec.md`).

## ADDED Requirements

### Requirement: CnFeaturesAndRoadmapLink

`CnFeaturesAndRoadmapLink` SHALL render as an `NcAppNavigationItem` that navigates to the route specified by its `routeName` prop (default `'features-roadmap'`). It SHALL accept a `disabled` boolean prop that, when `true`, causes the component to render nothing (admin opt-out path).

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `routeName` | String | No | `'features-roadmap'` | Vue Router route name to navigate to |
| `disabled` | Boolean | No | `false` | When `true`, the component renders nothing |
| `label` | String | No | `t('nextcloud-vue', 'Features & roadmap')` | Override the menu label |

#### Scenario: Default rendering navigates to the configured route

- **WHEN** a host app mounts `<CnFeaturesAndRoadmapLink />` inside its `<NcAppNavigationSettings>`
- **THEN** an `NcAppNavigationItem` with the i18n label appears
- **AND** clicking it triggers a Vue Router navigation to route name `features-roadmap`

#### Scenario: Disabled flag renders nothing

- **WHEN** `disabled` is `true`
- **THEN** the component renders no DOM (no menu entry visible)

### Requirement: FeaturesAndRoadmapView

`FeaturesAndRoadmapView` SHALL render a route-level view with two tabs (Features / Roadmap), a header "Suggest feature" button that opens `SuggestFeatureModal`, and an "admin disabled" empty state when the `disabled` prop is `true`.

| Prop | Type | Required | Description |
|---|---|---|---|
| `repo` | String | Yes | `<owner>/<repo>` of the app's GitHub repo |
| `features` | Array | Yes | Feature objects `{slug, title, summary, docsUrl}` |
| `disabled` | Boolean | No | When `true` shows the admin-disabled empty state |

#### Scenario: Both tabs render

- **WHEN** the route is visited
- **THEN** a Features tab and a Roadmap tab are visible
- **AND** the Features tab is the initial active tab

#### Scenario: Suggest button opens modal

- **WHEN** the user clicks the header "Suggest feature" button
- **THEN** `SuggestFeatureModal` opens

#### Scenario: Disabled state

- **WHEN** `disabled` is `true`
- **THEN** the view renders an `NcEmptyContent` with the localized "This feature has been disabled by your administrator" message
- **AND** no tabs and no Suggest button are visible

### Requirement: FeaturesTab

`FeaturesTab` SHALL render the `features` prop alphabetically by title, with each `docsUrl` link opening in a new tab via `target="_blank" rel="noopener noreferrer"`. When the array is empty it SHALL render a localized empty-state message.

#### Scenario: Alphabetical sort

- **GIVEN** `features` = `[{title: 'Beta'}, {title: 'Alpha'}, {title: 'Gamma'}]`
- **WHEN** the tab renders
- **THEN** items appear in the order `Alpha`, `Beta`, `Gamma`

#### Scenario: Empty list

- **GIVEN** `features` is `[]`
- **WHEN** the tab renders
- **THEN** the localized "No features documented yet" empty state is shown

### Requirement: RoadmapTab

`RoadmapTab` SHALL fetch from `GET /index.php/apps/openregister/api/github/issues?repo={repo}&labels=enhancement,feature` on mount, render each item via `RoadmapItem`, sort by `reactions.total_count` descending, and handle the three documented degraded responses (PAT-not-configured hint, GitHub-rate-limited, network error) with distinct localized messages.

| Prop | Type | Required | Description |
|---|---|---|---|
| `repo` | String | Yes | `<owner>/<repo>` passed through to the proxy |
| `disabled` | Boolean | No | When `true`, the tab renders the admin-disabled empty state |

#### Scenario: Successful fetch renders items

- **WHEN** the proxy returns `200 {items: [...]}` 
- **THEN** each item renders as a `RoadmapItem`
- **AND** items are sorted by `reactions.total_count` descending

#### Scenario: PAT-not-configured graceful degradation

- **WHEN** the proxy returns `200 {items: [], hint: "github_pat_not_configured"}`
- **THEN** the localized "Ask your admin to configure the GitHub PAT" empty state renders

#### Scenario: Rate-limited

- **WHEN** the proxy returns `429 {error: "github_rate_limited", reset_at: <ISO>}`
- **THEN** the localized "GitHub temporarily unavailable, try again later" message renders with the reset time

#### Scenario: Network error

- **WHEN** the fetch rejects with a network error
- **THEN** the localized generic error message renders with a retry button

### Requirement: RoadmapItem

`RoadmapItem` SHALL render an issue's title, submitter avatar + login, reaction count, relative created time, body (markdown via `marked` + `DOMPurify` using `SAFE_MARKDOWN_DOMPURIFY_CONFIG`), and labels filtered through `ROADMAP_LABEL_BLOCKLIST`. The component MUST NOT use `v-html` on any raw GitHub-supplied value.

| Prop | Type | Required | Description |
|---|---|---|---|
| `item` | Object | Yes | Issue object from the proxy |

#### Scenario: Markdown sanitization

- **GIVEN** an item body containing `<script>alert(1)</script>` 
- **WHEN** rendered
- **THEN** the `<script>` element MUST NOT appear in the DOM
- **AND** the visible text reflects only the safe portions

#### Scenario: Hydra label blocklist

- **GIVEN** an item with labels `[{name: 'enhancement'}, {name: 'build:queued'}, {name: 'ready-to-build'}]`
- **WHEN** rendered
- **THEN** the chip for `enhancement` is visible
- **AND** the chips for `build:queued` and `ready-to-build` are NOT visible

### Requirement: SuggestFeatureModal

`SuggestFeatureModal` SHALL render a title field (3–200 chars, required), a body markdown textarea (≥ 10 chars, required), a live preview toggle reusing the same `marked` + `DOMPurify` pipeline, a hidden `specRef` field (pre-filled from `useSpecRef()` when launched from a context that declared one), and a Submit + Cancel pair. On Submit it SHALL POST `{repo, title, body, specRef?}` to `/api/github/issues` with the Nextcloud CSRF token, then close on `201` and emit a `submitted` event with the response payload.

#### Scenario: Submit disabled until valid

- **GIVEN** the title is shorter than 3 chars OR the body is shorter than 10 chars
- **WHEN** the modal renders
- **THEN** the Submit button is disabled

#### Scenario: Submit success closes modal

- **WHEN** the POST returns `201` with `{number, html_url}`
- **THEN** the modal emits `submitted` with the payload
- **AND** the modal closes

#### Scenario: Rate-limited

- **WHEN** the POST returns `429 {error: 'rate_limited', retry_after}`
- **THEN** the modal stays open
- **AND** the localized "Too fast — try again in N seconds" message renders next to the Submit button

#### Scenario: specRef pre-fill via useSpecRef

- **GIVEN** the modal is opened from a context where `useSpecRef()` resolves `catalog-management`
- **WHEN** the user submits
- **THEN** the POST body carries `"specRef": "catalog-management"`

### Requirement: useSpecRef composable

`useSpecRef()` SHALL return the kebab-case capability slug from (a) the nearest ancestor component's `$options.specRef` / `defineOptions({specRef})` value, with (b) Vue Router `route.meta.specRef` as fallback. It SHALL return `null` when neither source provides a value.

#### Scenario: Component option wins

- **GIVEN** an ancestor declares `specRef: 'foo'` and the active route has `meta.specRef: 'bar'`
- **WHEN** `useSpecRef()` is called
- **THEN** it returns `'foo'`

#### Scenario: Route meta fallback

- **GIVEN** no ancestor declares `specRef` and the active route has `meta.specRef: 'bar'`
- **WHEN** `useSpecRef()` is called
- **THEN** it returns `'bar'`

#### Scenario: Both absent

- **GIVEN** no source provides a value
- **WHEN** `useSpecRef()` is called
- **THEN** it returns `null`

### Requirement: useSuggestFeatureAction helper

`useSuggestFeatureAction()` SHALL return an `NcActions` action descriptor (`{label, icon, action}`) for the "Suggest feature" action when `useSpecRef()` resolves a non-empty slug; otherwise it SHALL return `null`. The action's `action` callback SHALL open `SuggestFeatureModal` with the resolved slug pre-filled.

#### Scenario: Returns action when specRef present

- **GIVEN** `useSpecRef()` returns `'catalog-management'`
- **WHEN** `useSuggestFeatureAction()` is called
- **THEN** an `NcActions` item with label "Suggest feature" is returned

#### Scenario: Returns null when specRef absent

- **GIVEN** `useSpecRef()` returns `null`
- **WHEN** `useSuggestFeatureAction()` is called
- **THEN** `null` is returned

### Requirement: SAFE_MARKDOWN_DOMPURIFY_CONFIG

The library SHALL export a frozen `SAFE_MARKDOWN_DOMPURIFY_CONFIG` constant (a `DOMPurify` config object) that disallows `<script>`, all `on*` attributes, `javascript:` URLs, `<iframe>`, and `<style>`. Both `RoadmapItem` and the live-preview pane of `SuggestFeatureModal` SHALL use this exported config — no inline override.

#### Scenario: XSS vectors stripped

- **GIVEN** input `<script>alert(1)</script><a href="javascript:alert(2)" onclick="alert(3)">x</a><iframe src="evil"></iframe>`
- **WHEN** `DOMPurify.sanitize(input, SAFE_MARKDOWN_DOMPURIFY_CONFIG)` is applied
- **THEN** no `<script>`, `<iframe>`, `href="javascript:"`, or `onclick` attribute is present in the output

### Requirement: ROADMAP_LABEL_BLOCKLIST

The library SHALL export a `ROADMAP_LABEL_BLOCKLIST` constant — an array of 20 `RegExp` patterns matching hydra pipeline / workflow labels (`^build:`, `^code-review:`, `^security-review:`, `^applier:`, `^retry:`, `^rebuild:`, `^fix:`, `^fix-iteration:`, `^build-retry:`, `^ready-`, `^needs-input$`, `^yolo$`, `^openspec$`, `^agent-maxed-out$`, `^pipeline-active$`, `^done$`, `:queued$`, `:running$`, `:pass$`, `:fail$`). `RoadmapItem` SHALL filter labels through this list before rendering.

#### Scenario: All 20 patterns present

- **WHEN** the package consumer imports `ROADMAP_LABEL_BLOCKLIST`
- **THEN** the array contains exactly the 20 patterns from D16 in the openregister design

### Requirement: i18n coverage

All user-visible strings SHALL wrap with `t('nextcloud-vue', '...')` and SHALL have entries in both `l10n/en.json` and `l10n/nl.json`. Strings cover: menu label, route title, tab labels, three Roadmap empty-state messages (PAT-not-configured / rate-limited / network), Features empty-state message, Suggest button label, modal title, modal field labels, validation error messages, success toast, generic error toast.

#### Scenario: Every t() call resolves

- **WHEN** the components render in either locale
- **THEN** every `t('nextcloud-vue', key)` call resolves to a non-empty string

### Requirement: Public-API exports

`src/index.js` SHALL export the six new components, the composable, the helper, and the two constants. `src/components/index.js` SHALL include the six components. `npm run check:docs` SHALL pass — every named export has a matching `.md` under `docs/components/` (components) or `docs/utilities/` (composable, helper, constants).

#### Scenario: check:docs passes

- **WHEN** `npm run check:docs` runs after this change
- **THEN** exit code is 0
- **AND** the report shows 100% coverage on the new exports

### Requirement: JSDoc coverage on new components

Every prop, event, and slot on the six new `Cn*` SFCs SHALL carry JSDoc satisfying `npm run check:jsdoc`'s 100%-for-new-components rule. The per-component baseline at `scripts/.jsdoc-baselines.json` is bumped accordingly.

#### Scenario: check:jsdoc passes

- **WHEN** `npm run check:jsdoc` runs after this change
- **THEN** exit code is 0
- **AND** no new regression is reported

### Requirement: Peer dependencies

`package.json` SHALL declare `marked` (>= 12) and `dompurify` (>= 3) as peer dependencies. Consumer apps SHALL install matching versions; the library SHALL NOT bundle them directly.

#### Scenario: Peer deps documented

- **WHEN** a consumer inspects `package.json`
- **THEN** `peerDependencies` contains `marked` and `dompurify` with semver constraints
