# Changelog

## [Unreleased]

### Security
- **The sanitizer that runs in the markdown editor is no longer a 2.x copy.** `@toast-ui/editor` depends on `dompurify@^2.3.3`, so installing this library brought a SECOND sanitizer into the tree beside the 3.x it declares. That nested copy carried fifteen open XSS advisories, and it is the copy that actually sanitizes what a user types. This library's own dompurify being current said nothing about it, which is why it went unnoticed.

  An `overrides` entry collapses the two onto one version, written as `$dompurify` so it follows this package's own dependency and cannot drift behind it. Toast UI works against dompurify 3: verified in a real browser, where the editor lazily mounts and typing still round-trips through `v-model`. `tests/packaging/sanitizer-is-not-downgraded.spec.js` fails if a 2.x copy ever returns.

- **Every advisory that could reach a consumer is closed, and the count that mattered was never 247.** GitHub reported 247 across the repository, which is the sum of three separate package trees. `styleguide/` and `docusaurus/` are documentation tooling that no consumer installs. The root package held 33, of which 8 were reachable from `dependencies`, and of those 8 only three could run in a consumer's browser or server: the Toast UI sanitizer above, `axios` through `@nextcloud/axios`, and `fast-uri` through `ajv`. The rest, `postcss`, `browserslist` and `baseline-browser-mapping`, arrive as dependencies of build tools that npm classifies as production because `vue-router` declares `unplugin`, and they never execute in shipped code.

  Raised through `overrides` rather than direct bumps, because every one of them is transitive: `axios` to 1.18, `form-data` to 4.0.6, `fast-uri` to 3.1.6, `postcss` to 8.5.23, plus `browserslist`, `baseline-browser-mapping`, `brace-expansion`, `ip-address`, `js-yaml`, `picomatch`, `svgo`, `colord`, `postcss-selector-parser` and `fast-xml-parser`. Every one stays inside its current major, so no API moves. `@semantic-release/npm` goes to 13.1.5, which clears twelve advisories in the release tooling including the only critical one, `tar`.

  `axios` deliberately stops at 1.x. The 2.x line is `exports`-only, and a directory alias naming a path inside it fails at build time in consuming apps.

  Root `npm audit` now reports 0, and `npm audit --omit=dev` reports 0.

### Fixed
- **The open tab now decides the whole Actions menu, including a catalog panel's Add.** A panel draws no header, so anything that header would have carried is gone unless it is published to the strip. `CnObjectDataWidget` publishes its Metadata and full-form Edit. `CnDetailWidgetHost` did not publish its own: the catalog **Add** lives in the card header the host draws off a panel, so a Documents or Files tab had no way to add anything at all. Reported from a real case, where the Data tab's menu offered only the built-in trio.

  The channel now keys by SOURCE as well as by widget id, because a panel has two possible publishers. With one slot per widget, whichever published last silently replaced the other, so a panel with both would have lost one.

  `allowCreate: false` is still honoured: a read-only list publishes no Add, so a panel never offers what a card refuses.

- **`CnNcWidgetWidget` says when a proxied widget cannot be shown here, instead of saying it has no items.** A dashboard widget whose provider implements only `IWidget` declares `itemApiVersions: []` and is simply ABSENT from the widget-items response. With no native callback registered on the page, the proxy used to render "No items available" under it. For the Tasks app's widget on a case handler's dashboard that read as "you have no tasks" while five were due, and the same list appeared the moment LaunchPad's legacy widget bridge was switched on.

  The two cases were always distinguishable, they just were not distinguished: an unsupported widget has no key in the response, while a widget with nothing right now comes back as its own key holding an empty list (the Mail app's `{items: [], emptyContentMessage}`). Only a SUCCESSFUL response can say a widget is absent, so a failed request keeps the ordinary empty state rather than a claim about the app. No extra request is made.

- **`@conduction/nextcloud-vue/stylelint` now loads.** The published preset extends `@nextcloud/stylelint-config`, and this package never declared it, so `require('@conduction/nextcloud-vue/stylelint')` threw `MODULE_NOT_FOUND` in any app that had not installed it for its own reasons. Same failure as the `marked` / `dompurify` / `dexie` peers fixed in #1048: a file this package ships depended on something it did not declare.

  It went unnoticed because this repository linted itself with a DIFFERENT config and never loaded the one it shipped. `stylelint.config.js` is now a one-line re-export of the preset, so `npm run stylelint` exercises exactly what an app gets, and `tests/packaging/stylelint-preset-resolves.spec.js` fails if the preset stops resolving or the repository stops using it.

  `stylelint` and `@nextcloud/stylelint-config` are declared as OPTIONAL peers, exactly as the ESLint preset declares its tooling: the preset is an opt-in subpath, and an app that never lints with it should not download stylelint.

  **No app has to change anything.** None currently requires the preset; launchpad and openregister extend `@nextcloud/stylelint-config` directly and carry the `::v-deep` exception inline. They can now drop that copy and require the preset instead, which is what it was written for.

- **`npx manifest-migrate` now runs in an app.** The package publishes it as a `bin`, and `src/cli/manifest-migrate.js` requires `commander`, which sat in `devDependencies`. A consumer never installs a package's dev dependencies, so the command died with `Cannot find module 'commander'` before it printed a word. It is now a runtime dependency. Third of its kind after the stylelint preset above and the peers in #1048.

  It moves to 14, not the 15 Dependabot proposed: commander 15 is ESM-only and the CLI is CommonJS, and loading it would lean on `require()` of an ES module, which Node 20 does not support. `tests/packaging/bin-scripts-declare-their-dependencies.spec.js` reads the requires out of every published command, following its relative imports, and fails if any package one of them needs is not in `dependencies`. It names no package, so the next CLI that picks up a dev dependency fails there too.

- **stylelint 14 to 17, matching the fleet.** The apps were already on 17 through `@nextcloud/stylelint-config` 3; this repository was three majors behind the config it publishes. `stylelint-config-recommended-vue` stays on 1.x because `@nextcloud/stylelint-config` pins `^1.6.1`, and `stylelint-config-html` is held at 1.x so its `postcss-html` peer agrees with that.

  The new rules raised 120 errors, all fixed. 91 were a missing blank line before a rule. The other 29 were deprecated CSS, and each was handled for what it does rather than by the autofixer:

  - `word-break: break-word` (16) became `overflow-wrap: anywhere`. That is its exact specified meaning, and the spec also says it overrides any other `overflow-wrap` in the rule, so a second declaration in the same rule was removed rather than left to disagree.
  - `clip` (7) is in every case part of a visually-hidden, screen-reader-only pattern. It became `clip-path: inset(50%)`, or was dropped where that was already present. Removing it outright would leave the text hidden only by its 1px box.
  - `word-wrap` (6) became `overflow-wrap`, its standard name.

  The autofixer was run for the blank-line rule alone, and it still rewrote `<style` to `\3c style` inside two CSS comments. Both were restored by hand.

  201 `csstools/use-logical` **warnings** remain, deliberately. That rule rewrites `border-left` as `border-inline-start`, which changes rendering in right-to-left layouts. It is the right direction, but it is a visual change to review component by component, not a side effect of a tooling bump. Warnings do not fail the gate.

- **`@types/react` no longer ships to every consumer.** It sat in `dependencies`, so all 21 fleet apps downloaded React type definitions with this library. Nothing referenced it: no source import, no `.d.ts` reference, no installed package declaring it as a peer, and the only mentions of "react" in the type declarations are the words "reactive" and "react to" in prose. The `@uiw/codemirror-theme-*` packages are framework-agnostic CodeMirror extensions despite their repository's name, which is the likeliest reason it was added. Removed rather than bumped to 19, which is what Dependabot proposed.

- **`@codemirror/lint` to 6.9.7 and `@uiw/codemirror-theme-github` to 4.25.11.** Both already inside their declared ranges, so this is a lockfile move.

- **The unit suite no longer fails a random spec per run.** 361 specs mount components and only 81 unmounted them, so most tests left a live component attached to the jsdom document for the rest of the file, keeping its watchers, timers and listeners in the DOM the next test queried and clicked. The symptom was a click that did nothing: `wrapper.emitted(...)` came back undefined and the spec failed on a line that was not the bug. Four click-based specs did it, one per full run, each passing in isolation and on a re-run of the same tree.

  `jest.config.js` had already named the lead in its own header: "the lead worth pulling is per-suite teardown of mounted components, not this config". `tests/setup.js` now calls Vue Test Utils' `enableAutoUnmount(afterEach)`, which tracks every wrapper `mount()` created so no spec has to remember. Measured over six consecutive full runs before and after.

  Teardown running at all exposed two things that had never been reached. `URL.createObjectURL` and `URL.revokeObjectURL` are now stubbed globally, because jsdom implements neither and `CnImageWidgetForm` revokes its preview on unmount. And one saved-views test asserted on a dialog one tick after the click that opens it, which is a tick too early when the handler has its own promise to settle.

- **`CnCalendarWidget` now says when no calendar has been chosen, instead of reporting an empty diary.** The host fetches events only for the calendars named in `content.internalCalendars` / `content.externalIcsUrls`, and it skips the fetch entirely when both are empty: LaunchPad's `CalendarWidgetService::getEvents()` guards each branch with `!== []`, so an unconfigured widget comes back with zero events **and zero failures**. The widget could not tell that apart from a genuinely empty week and said "No events in the next 14 days".

  It is not a rare state. The registry's own `defaultContent` for this widget type is `internalCalendars: []`, so every freshly added Calendar widget started there and made a false statement about the user's diary, forever, with nothing on screen suggesting configuration was the missing step. Measured on the dev instance: three events existed today and the widget reported none.

  The new state only claims itself when a content blob is present and both lists are empty. A host driving the widget through `dataSource` alone keeps the ordinary empty message, so no existing consumer changes.
- **A `data` widget in a tab panel keeps its own menu items, and no longer shows an empty header band.** Follow-up to the change below, which rendered the header whenever the `actions` slot was filled and read "filled" as the slot being PROVIDED. `CnObjectDataWidget` provides that template always and fills it only while an edit is unsaved, so an idle panel still carried a 59px band holding nothing. A new `slotContent` helper calls the slot and inspects the vnodes, so a `Comment` placeholder from a falsy `v-if` and a whitespace-only `Text` node both read as empty.

  The band also held the widget's own overflow menu, about eight pixels from the tab strip's own, so `CnDetailWidgetHost` now passes `show-actions="!isBare"`. `chromeless` does not cover that menu.

  Suppressing the menu would have taken two items with it. **Metadata** had no other home anywhere. **Edit** had a near neighbour, the record Edit button on a detail page header, but that opens the form the PAGE configures rather than the field subset the widget declares through `overrides`, `include` and `exclude`, so a tabbed widget showing eight of forty fields lost the form scoped to its eight. The open panel now publishes both items and `CnTabsWidget` renders them in its own menu, keyed by widget id because a `lazy` tab stays mounted once visited and would otherwise offer actions for a sheet nobody is looking at. They are published, not rebuilt: each carries a callback into the widget that published it, so Edit still opens that widget's dialog with that widget's configuration and still commits through its own save path. `src/utils/panelActions.js` carries the contract.

- **A `data` widget in a tab panel no longer draws a card inside the card.** `CnTabsWidget` already asked for bare chrome, but `CnObjectDataWidget.title` carries a default of `"Data"`, so the `undefined` bare mode passed became that default: the heading in the panel was a default filling a gap, not a choice. `CnObjectDataWidget` gains `showTitle`, `borderless` and `flush`, and `CnDetailWidgetHost` passes them instead of exempting the widget.

  The exemption was protecting something real, so two things changed together. `CnWidgetWrapper` now renders its header when there is a title **or** when the `actions` slot is filled, so "no title" and "no Save button" became separate requests — previously hiding the header to remove the duplicate title also removed the only control that commits an inline edit.

  The header condition reads the SLOT, not `showActions`: that prop defaults to `true` and governs the overflow menu, so reading it there gives a header to every headerless KPI tile that never had one.
- **`CnTabsWidget`'s panel chrome now beats an older app's copy of the old rule.** Nextcloud serves every enabled app's assets on every page, each app bundles this library's compiled CSS, and the Vue scope id is derived from the file PATH, so `data-v-1dbd6122` is byte-identical across library versions. An app still on an older release therefore ships a rule with exactly the same selector and the OLD declarations, and it lands on the pages of an app already on the new one. Measured live on a dossiq case page: three stale copies of the pre-fix rule, one from hermiq's `companion.css` and two inline from other bundles. Same specificity, so source order decided, and the card border came back around the tab strip on an app that had already taken the fix.

  The root rule doubles its class, taking it to (0,3,0) against the stale (0,2,0), and explicitly zeroes `border`, `border-radius`, `background-color` and `overflow` rather than merely omitting them, since dropping a declaration cannot override a rule that sets it. It wins on specificity rather than on `!important` or on load order this library does not control. Same technique, for the same reason, as `.cn-tabs__nav .cn-tabs__nav-item` beating Nextcloud's own button margin.

  **This is a general property, not a dossiq fix:** any styling this library ships can be overridden by any app on the fleet that has not yet rebuilt, and whichever app loaded last wins. Rules that must hold during a staged rollout need this treatment.
- **`marked`, `dompurify` and `dexie` are required peers again, not optional ones.** All three are imported STATICALLY at the top of modules that are reachable from the package root, so a consumer without them fails to resolve at build time with a bare `Module not found` naming a package it never asked for. `optional: true` tells npm the opposite: do not install it, and do not warn when it is missing. 2.42.0 shipped `marked` and `dompurify` that way; `dexie` had been that way longer, and its own docblock said only apps using the offline core needed it, which `src/index.js` → `offlineCollection` → `integrations/builtin/field-inspection` → `offline/offlineDb.js` contradicts.

  **No consumer has to change anything.** Every app in the fleet already declares all three. What changes is that npm now installs them for an app that does not, instead of failing that app's build.

  The `marked` range is widened from `^12.0.0` to `>=12 <19`. The fleet spans marked 12 (opencatalogi) to 18 (everyone else), and the library only uses `new Marked({...})` and `.parse()`, which exist across that whole span. Before this, taking the library at all put `npm ls` into `ELSPROBLEMS` for every app on 18.

  A packaging test now walks `src/` for static imports of any optional peer and fails on a match, so the next component that imports one is caught here rather than in someone else's build. Making an import dynamic is what earns the optional marker back.
- **`CnDetailWidgetHost` and `CnIntegrationWidget` now resolve every integration leaf through the lib-owned registry path.** Both read `provider.tab` / `provider.widget` straight off the shared registry entry for bare tab panels, skipping the `__libOwned` swap that `useIntegrationRegistry().resolveTab` / `resolveWidget` apply. When OpenRegister's `integration-global` bundle had registered the entry, the rendered component belonged to that bundle's Vue: its `resolveComponent()` found no current instance and `NcButton` / `CnDetailCard` reached the DOM as literal `<ncbutton>` / `<cndetailcard>` elements. Seen live on dossiq's case page: the Notes and Contacts tabs showed the raw tags and the Files tab rendered an empty card. `useIntegrationRegistry` gains `resolveBaseWidget(id)`, the surface-agnostic counterpart of `resolveWidget` that a `bareWidget` provider is rendered through. Consumer-custom ids (no `__libOwned`) still resolve to their stored component.

### Added
- **`CnObjectListWidget` can read several fields off one reference, carry row actions, and take a file drop.** Three keys on its content blob: `extend`, `rowActions` and `dropZone`.

  `extend` is the OpenRegister `_extend[]` list sent with the fetch, and it is what makes a dotted column key work. `CnDataTable` reads `informatieobject.title` as a path into the row, and a reference property holds a uuid string at that key, so six columns off one referenced object rendered as one repeated value with nothing logged and nothing failing. The built-in `fkResolve` cell widget answers the one-label case and does not answer this one, because it resolves a single `labelField` per column.

  `rowActions[]` and `dropZone` both take entries in the unified manifest action shape, dispatched through the page's own dispatcher, so this widget grows no second action vocabulary. A `handler` action receives the row (or the dropped `File[]`) as its final argument; an `open-modal` drop receives the files as `props.files`, because a modal has no argument list. Declaring neither key leaves the rendered table byte-for-byte what it was: the trailing actions column is only painted when the slot is supplied, and a widget without `dropZone` returns from every drag handler before touching any state.

  The widget uploads nothing on a drop. It reads no file content and calls no write endpoint — whoever receives the files decides where they go, the same split the form file field keeps. A drag carrying anything but files is left to the browser.

  This is `dossiq-duplication-to-abstractions` 1.2, and it is what dossiq's `documents-on-the-case` 2.2 has been waiting on. That task needs all three: six fields off `informatieobject`, a Versions row action, and the Documents tab's drop handler.

- **Every host of `CnFormDialog` can now ask for its size and its column count, not just the manifest `open-form` action.** `CnIndexPage` and `CnDetailPage` take `formSize` / `formColumns` props (declarable as `pages[].config.formSize` / `.formColumns`, both now in the v2 manifest schema), `CnObjectListWidget` reads `formSize` / `formColumns` off its content blob, and `CnObjectDataWidget` takes them as props.

  The dialog has supported `size` and `columns: 2` since two-column forms shipped, but only `CnActionButtons` ever passed them on. The result was not a missing feature so much as an inconsistent one: the same app could open a roomy two-column create form from a detail page's header action and a cramped one-column form for the same kind of record from its index page's Add button, with nothing in either manifest to explain why. Dossiq had exactly that — a case create form in two columns, and a case-type create form asking 41 properties in one.

  `CnObjectListWidget` also gains `formIncludeFields`, `formExcludeFields` and `formFieldOverrides` on its content blob. It builds its create form from the WHOLE fetched schema, so a list scoped to four columns still opened a dialog asking every property the schema declares; the way out was `allowCreate: false`, which removes the affordance rather than configuring it.

  Nothing changes for a consumer that declares none of these: every host defaults to the `normal`, one-column, unscoped dialog it rendered before.
- Optional top-level `mcp` block in the v2 app manifest schema (`src/schemas/app-manifest-v2.schema.json`) — advisory MCP tool visibility/UX hints (`expose`, `pageTools`, `agentHints`) per ADR-063. Purely presentational: OpenRegister's register + RBAC remain the sole source of CRUD-tool truth and invoke-time authority; nothing in `nextcloud-vue` reads `manifest.mcp`. Fully optional and additive — existing manifests validate unchanged
- `CnAppRoot` `dataSourcesLoader` prop — an async `() => ({ registers })` re-invoked every time a pages-editor modal opens, so a register or schema created after app boot appears without a page reload. Feeds a stable reactive `cnDataSourcesState` holder (provided **by reference** and mutated in place, so the one-shot `provide()` still observes updates) plus a provided `cnRefreshDataSources()` action that de-dupes concurrent refreshes and keeps the last good list on failure. The existing `dataSources` prop and `cnDataSources` provide key are unchanged — a consumer passing only the snapshot, or neither prop, behaves exactly as before
- Pages-editor Register/Schema selects now show a loading state while a refresh is in flight, and render an error notice with a Retry control when the fetch fails, so a failed load is no longer indistinguishable from "no schemas exist"
- `useAppInstaller` composable — one-click "Install and enable" for missing app dependencies via Nextcloud's own store endpoint (NC34+ `appstore` OCS API with strict password confirmation; legacy `/settings/apps/enable` fallback for ≤NC33)
- Admin-aware install/enable buttons on `CnDependencyMissing` and the `CnAppRoot` or-missing guard; non-admins get "ask your administrator" copy instead of a dead-end settings link
- HARD vs SOFT dependency model: manifest `dependencies` entries may now be objects `{ id, required, name }` — `required: false` marks an optional dependency that no longer blocks the app shell and instead shows a dismissible in-shell notice (dismissal persisted per app+dependency); plain string entries stay hard/blocking (fully backward-compatible, schemas v1 1.8.0 / v2 2.18.0)

### Changed
- **A detail page's `headerActions` are entries in its Actions menu, not a row of buttons.** `CnDetailPage` used to render every manifest `config.headerActions[]` entry as its own `NcButton` beside the title. On a dossiq case that is twelve buttons, and the case title was squeezed to a truncated stub to make room. The manifest schema has always described this key as living in the overflow menu, and `CnIndexPage` already put it there, so the two page types had quietly drifted apart. They agree again.

  Edit and the Buildiq edit button stay inline. Those are the two controls a handler reaches for on nearly every visit.

  **What changed for a consumer:** nothing in the manifest. The same `headerActions[]` produces the same actions, with the same ids, labels, icons, `visibleWhen` gating and dispatch behaviour. Only the placement moved. A test that clicked one of these by role and label needs to open the menu first; each entry keeps its `data-testid="cn-action-<id>"`, so only the navigation to it changes.

  Two seams were added to make this work. `CnActionButtons` takes `display="menu"`, in which it renders no buttons and emits an `entries` event instead: one menu-ready descriptor per visible action, carrying the resolved label, the icon split into mdi name or legacy class, the pending and pressed state, and a pre-bound `run()`. It keeps owning the dialogs its actions open. `CnActionsMenu` takes a `#primary-items` slot, rendered after Refresh and before the Request a feature / Report a bug / Documentation trio. The two are separate because `NcActions` keeps only `NcAction*` vnodes out of its default slot, so a wrapper component placed in the menu renders nothing at all.
- **`CnTabsWidget` draws its card around the panel, not around the tab strip.** The border, the rounded corners and the background sat on the widget root, which boxed the tabs in behind a second edge above them. Folder tabs are drawn as the edge of the sheet they open, so an outline around them reads as a header the widget does not have. The chrome now lives on `.cn-tabs__content`: three sides, since the bar's own bottom rule is the sheet's top edge, and rounded on the bottom two corners only, since rounding the top would curl the sheet away from the tab joined to it. The bar loses its 8px inset so its rule spans the full width of the panel below.
- **Dashboard widget type registrations are consolidated in one module.** `CnMapWidget/index.js` and `CnObjectListWidget/index.js` no longer call `registerDashboardWidget` — every built-in type is now registered solely by `components/CnWidgetGrid/registerDashboardWidgets.js`, which both the package root (`src/index.js`) and the `components` barrel import. **No consumer that imports from the package root or the `components` barrel has to change anything:** the catalog is populated exactly as before, and the resulting registry is byte-for-byte identical (verified across all 39 registered types). Both modules keep their `CnMapWidget` / `CnObjectListWidget` exports, default and named, so component imports are unaffected too.

  The two types were previously registered TWICE on every boot — once by the widget's own `index.js`, once inline by the aggregator — which logged `[dashboardWidgetRegistry] widget type "map"/"object-list" is already registered` in every consuming app's console. For `map` the duplicate entries were identical; for `object-list` they diverged (`limit: 5` with no `surfaces` against the aggregator's `limit: 25` and `surfaces: ['legacy']`), so module load order decided whether that legacy alias stayed hidden from the Add-widget picker. The aggregator's entry — the one that already won — is now the only one.

  **The one case that changes:** deep-importing a widget's own module purely for its registration side effect, e.g. `import '@conduction/nextcloud-vue/dist/esm/components/CnMapWidget/index.js'`. That never was a supported entry point (these components are resolved by their registry type key, not imported), and it only ever worked by accident for these two of the ~39 types. It now yields the component without registering the type. Import the package root, or `components/CnWidgetGrid/registerDashboardWidgets.js` if you cherry-pick modules. To make the failure legible rather than a bare "Widget unavailable" tile, `CnWidgetGrid` now distinguishes an EMPTY catalog from an unknown key and names that fix in its console warning. Every app in the fleet was checked before this landed: 22 repos across their `development`, `beta` and `main` branches, 65 branch snapshots, zero deep imports.
- **Fleet rename of 2026-08-21 applied to this library.** The Conduction apps this library names in its components, copy, and docs were renamed (OpenConnector→Integriq, DocuDesk→Filinq, Procest→Dossiq, Doriath→Keepiq, Decidesk→Decidiq, OpenBuild→Buildiq, LarpingApp→Larpinq, Scholiq→Learniq, SoftwareCatalog→Stackiq, Planix→Planninq; OpenRegister, OpenCatalogi, Pipelinq, Hermiq, Launchpad are unchanged). **No consumer code has to change.** Concretely:
  - Two public exports were renamed to their canonical new names, with the old names kept as **deprecated aliases** of the same implementation:
    - `CnOpenBuildEditButton` → **`CnBuildiqEditButton`** (component; file moved to `src/components/CnBuildiqEditButton/`)
    - `useOpenBuildEditAvailability` → **`useBuildiqEditAvailability`** (composable; file moved to `src/composables/useBuildiqEditAvailability.js`)

    Both old names are still exported from the package root (`src/index.js`) and from the `components` / `composables` barrels, so existing imports keep working unchanged. They are marked `@deprecated`; migrate at your convenience. No runtime deprecation warning is emitted — the library has no such mechanism and this rename does not warrant inventing one.
  - **Deliberately NOT renamed**, because they are data or runtime contracts that shipped manifests and consuming apps already carry: the `openbuildEditable` manifest key, the `cnOpenBuildAvailable` provide/inject key, the `openConnectorSourcesUrl` / `openconnectorUrl` component props, every lowercase app id and `/apps/<id>/` URL (`openbuild`, `openconnector`, `nldesign`, `decidesk`, …), and the `ScholiqDashboards` component name the `promoteCustomDashboard` codemod matches on.
  - The `CnBuildiqEditButton` BEM block was renamed `cn-openbuild-edit*` → `cn-buildiq-edit*` (markup, its scoped styles, and the unscoped globals in `src/css/patches.css`). An app that overrode the old class names in its own CSS must update those selectors.
  - User-facing strings and their `l10n/en.json` / `l10n/nl.json` entries were updated (e.g. "OpenConnector is not installed." → "Integriq is not installed.", "Edit with OpenBuild" → "Edit with Buildiq"). Msgids changed with the copy, so translation memories will need a re-run.
  - Docs pages `cn-open-build-edit-button.md` and `use-open-build-edit-availability.md` were renamed to `cn-buildiq-edit-button.md` / `use-buildiq-edit-availability.md`; all cross-links follow.
- **`2.2.0-vue3.9` — manifest action `params` on `handler: "navigate"` now resolve `{field}` row tokens** (`src/components/CnIndexPage/manifestActionDispatch.js`). Previously a declared `params: { id: "{id}" }` was pushed **verbatim**, producing URLs like `/synchronizations/%7Bid%7D`; it now resolves against the row (`"{id}"` → `row.id` with its type preserved, `"item-{id}"` interpolates, a brace-less `"new"` stays literal), and a token naming a field the row does not carry is dropped with a `console.warn` so `id` falls back to the row id. This is a **behaviour change to a declarative contract that shipped inside a `-vue3.N` prerelease with no release note** — recorded here retroactively (nextcloud-vue#623). It is a fix, not a break: the previous output was a broken URL in every case, so nothing could have depended on it. Manifests that declare no `params` are unaffected, and the ordinary "open this row's detail page" action should **omit** `params` entirely — the row id is already injected

### Fixed
- **Peer dependencies no longer reach consumers as our copy.** Five declared peers were arriving from this package instead of resolving to the consumer's own: `dexie`, `dompurify`, `marked`, `@vueuse/core` and `gridstack`. A duplicate of any of these is not a larger bundle, it is a bug — and `dexie` does not fail quietly: its ESM entry claims a page-global singleton (`globalThis[Symbol.for("Dexie")]`) and throws at module evaluation when the copies disagree, so the consuming app loads its bundle and mounts nothing: `Two different versions of Dexie loaded in the same app: 4.4.5 and 4.4.4`. Those are the real numbers — the published `2.1.0-vue3.16` tarball froze dexie 4.4.4 while declaring peer `^4.0.8`, which resolves to 4.4.5, so consumers carried both with exactly ONE dexie in their own lockfile: the second copy was ours. pipelinq#1431 (a dependabot 4.4.4 → 4.4.5 bump) failed its E2E boot gate this way and pipelinq#1455 repeated it for `marked`. There were two independent routes, and fixing either alone would have left the defect intact:
  - **Inlined by rollup.** `rollup.config.vue3.mjs` was missing the `external` entries `rollup.config.js` has carried since the 2.20.1 singleton fix, because that rule was a hand-written list duplicated per config. It is now `rollup.singleton-externals.mjs`, one module both configs import, so neither can be the one that forgot. `@vueuse/core` was missing from *both* lists and is still vendored by the published 2.36.3 and 2.39.0, so this is not a Vue-3-only fix.
  - **Installed by npm.** `dompurify` and `marked` were declared in `dependencies` as well as `peerDependencies`, so npm put our copy in the consumer's tree regardless of what rollup did — and when their range could not dedupe with ours it nested at `node_modules/@conduction/nextcloud-vue/node_modules/`, where the bare specifier resolves to ours first. Both move to `devDependencies`, the peer + dev shape `dexie` and `gridstack` already used.
- **`scripts/check-bundled-peers.mjs` gates all of the above on the built artifact**, asserting that no peer is in `dependencies`, none is vendored under a `node_modules/` segment of `dist/`, and none is listed in `dist/bundled-packages.json` (the only signal covering the single-file CJS bundle). It reads the outcome rather than the configs on purpose — a check must not share the failure mode of the rule it checks, and this rule already drifted silently once. Wired as the `bundled-peers` CI job over both dists, and `isSingletonExternal()` gained unit tests pinning its subpath boundary. **Consumers must supply these five peers themselves.** `@vueuse/core` and `gridstack` are required peers that npm 7+ installs automatically; `dexie`, `dompurify` and `marked` are optional peers that npm installs for nobody, so an app using markdown, HTML sanitising or the offline core must declare them or the build fails with an unresolved bare specifier. See `docs/getting-started.md` for the ranges.
- `useObjectStore` fetch-by-id (`_requestObject`) wrote `console.error` on **every** non-ok response, including an expected **404**. A "not found" is the designed answer for whole classes of page — a credential- or reference-verification page exists precisely to ask whether an id is real — and the outcome is already recorded in `errors[type]` for the component to render, so the console line was a second, uncontrollable channel that failed consumers' "no fatal JS errors" e2e assertions with no way to suppress it from the app. Now guarded on `status !== 404`; genuine faults still log and name the status/statusText, with the payload unwrapped via `toRaw` (it previously printed as an unreadable `Proxy(Object)`). The `catch` branch is deliberately untouched — `fetch` does not throw on an HTTP status, so anything reaching it is a real network or parse fault. Completes nextcloud-vue#612, which fixed only the sub-resource paths (`createSubResourcePlugin`, `useSubResource`) and missed the single-object path that emits the message consumers actually see
- Pages editor showed a **stale** Register/Schema list: `provide()` runs once, so the `dataSources` snapshot captured at app boot could never reflect anything created afterwards, and the dropdown stayed wrong until a full page reload. Adopt `dataSourcesLoader` to fix (see Added)
- Removed a `node_modules` symlink accidentally committed to `beta`, pointing at an absolute path on one machine — it broke fresh clones and CI checkouts. It slipped past `.gitignore` because the pattern was `node_modules/`, and a trailing slash matches only directories while a symlink is a file to git
- `CnFormPage` — added the missing `@event step` and `@slot actions` / `@slot submit` JSDoc (styleguide docs were incomplete)
- `CnAppRoot` or-missing guard rendered raw `app-availability.*` i18n keys — English defaults now render when no translation is provided
- Unified the two overlapping user-picker widget paths on `user-select`; native Nextcloud user picker now renders for single-user fields
- `CnEditDataModal` register/schema cache can now be reset (`invalidateDataCache` exported)

## [1.0.0]

This is a major release. The library grew from 57 to 148 exported symbols and introduced a full manifest-driven app shell, a pluggable integration registry, and a comprehensive security layer. Apps on `0.1.0-beta.x` can upgrade without changing template code — all new props carry defaults and no existing props were removed.

See **[Migrating from 0.1.x](docs/migrating-from-0.1.md)** for the step-by-step upgrade checklist.

---

### Required changes for all apps

| # | What | Where |
|---|------|-------|
| 1 | Call `registerTranslations()` once before `new Vue().$mount()` | `main.js` |
| 2 | Bump `@conduction/nextcloud-vue` to `^1.0.0-beta` | `package.json` |

No component template changes are required. Existing props, events, and slots are all preserved.

---

### New: Manifest-driven app shell

Apps can now declare their entire shell — routes, navigation, pages, dependencies — in a single `src/manifest.json`. The library renders it without any boilerplate Vue Router setup.

| Symbol | Description |
|--------|-------------|
| `CnAppRoot` | Top-level app wrapper. Handles loading → dependency-check → shell phases. |
| `CnPageRenderer` | Type dispatcher mounted inside `<router-view>`. Matches routes by `page.id`. |
| `CnAppNav` | Manifest-driven `NcAppNavigation`. Sorts by `order`, filters by `permission`. |
| `CnAppLoading` | Default loading screen used by `CnAppRoot`. |
| `CnDependencyMissing` | Dependency-missing screen. Lists missing apps with install/enable links. |
| `useAppManifest` | Composable: load + validate the app manifest. Returns `{ manifest, isLoading, validationErrors }`. |
| `useAppStatus` | Composable: check whether a Nextcloud app is installed/enabled. Cached per `appId`. |
| `validateManifest` / `validateManifestV2` | Validate a manifest against the JSON Schema. |
| `resolveManifestSentinels` / `resolveRouteSentinels` | Bind `@route.*` sentinels into config at render time. |
| `dispatchAction` | Invoke a manifest-declared `handler` or `navigate` action. |

Manifest page types: `index`, `detail`, `dashboard`, `custom`. See [JSON Manifest Renderer](docs/getting-started.md) for adoption tiers.

---

### New: Pluggable integration registry

Apps register sidebar tabs and dashboard widgets that surface across `CnObjectSidebar`, `CnDashboardPage`, and `CnDetailPage` without coupling to the host app.

| Symbol | Description |
|--------|-------------|
| `integrations` | Shared registry singleton |
| `createIntegrationRegistry` | Factory for a new registry instance |
| `installIntegrationRegistry` | Install the singleton on `window.OCA.OpenRegister.integrations` |
| `registerIntegration` | Load-order-safe leaf-side helper |
| `useIntegrationRegistry` | Vue 2.7 composable: reactive view onto the registry |
| `builtinIntegrations` / `registerBuiltinIntegrations` | Library-provided built-in integrations (files, notes, tags, tasks, audit trail, talk) |

---

### New components

**Layout & Shell**

| Component | Description |
|-----------|-------------|
| `CnIndexSidebar` | Index page sidebar with schema description and filter summary |
| `CnDetailGrid` | Data-driven label-value grid (grid and horizontal layout modes) |
| `CnPageHeader` | Page header with icon, title, description |
| `CnActionsBar` | Action bar: add button, mass actions, view toggle, search |
| `CnActionsMenu` | Shared overflow action menu (Refresh, Documentation, Request Feature) |

**Dialogs**

| Component | Description |
|-----------|-------------|
| `CnCopyDialog` | Single-item copy with naming pattern selector |
| `CnAdvancedFormDialog` | Richer create/edit dialog with Properties table, Data (JSON) tab, CodeMirror, optional Metadata tab |
| `CnSchemaFormDialog` | Full JSON Schema editor: Properties, Configuration, Security tabs |
| `CnTabbedFormDialog` | Multi-tab form dialog |
| `CnMassActionBar` | Floating bar for mass action triggers |
| `CnMassCopyDialog` | Bulk copy with naming patterns |
| `CnMassExportDialog` | Bulk export with format selection |
| `CnMassImportDialog` | Bulk import with file upload |

**Data Display**

| Component | Description |
|-----------|-------------|
| `CnCardGrid` | Grid of object cards |
| `CnObjectCard` | Single object card |
| `CnFacetSidebar` | Faceted filter sidebar |
| `CnJsonViewer` | Syntax-highlighted code viewer/editor (CodeMirror; JSON, XML, HTML, plain text) |
| `CnCellRenderer` | Cell value formatter for tables |
| `CnStatusBadge` | Color-coded status/priority pill badge |
| `CnRowActions` | Row action buttons: inline + overflow dropdown |
| `CnContextMenu` | Right-click context menu (pair with `useContextMenu`) |
| `CnIcon` | MDI icon by name |
| `CnFilterBar` | Search + filter controls row |
| `CnQuickFilterBar` | Clickable filter-tab bar |

**Dashboard & Widgets**

| Component | Description |
|-----------|-------------|
| `CnDashboardGrid` | Low-level GridStack grid layout engine (drag/drop, resize) |
| `CnWidgetWrapper` | Widget container shell with header, content area, footer |
| `CnWidgetRenderer` | Renders Nextcloud Dashboard API widgets (v1/v2) with auto-refresh |
| `CnWidgetGrid` | V2 manifest slot dispatcher |
| `CnTileWidget` | Quick-access tile with icon and link |
| `CnChartWidget` | Chart widget with optional GraphQL dataSource |
| `CnStatsBlockWidget` | Stats block for dashboard use |
| `CnKpiGrid` | KPI metric cards grid |
| `CnStatsPanel` | Sections of stat blocks, list items, and progress bars |
| `CnProgressBar` | Labeled horizontal progress bar with variant colors |

**Object Widgets**

| Component | Description |
|-----------|-------------|
| `CnObjectDataWidget` | Schema-driven editable data grid: click-to-edit, dirty tracking, saves via objectStore |
| `CnObjectMetadataWidget` | Read-only metadata display: extracts `@self` block from OpenRegister objects |

**Settings**

| Component | Description |
|-----------|-------------|
| `CnSettingsSection` | Settings section container with flex header (heading + actions) |
| `CnRegisterMapping` | Register mapping configuration |
| `CnVersionInfoCard` | Version info display card |

**Notifications & Support**

| Component | Description |
|-----------|-------------|
| `CnSupportDialog` | Support dialog with server-side persistence, auto-mounted by `CnAppRoot` |
| `CnNotificationPreferences` | User notification preferences pane, shown in settings slot |

**App-level Pages**

| Component | Description |
|-----------|-------------|
| `CnLogsPage` | Log viewer page |
| `CnFilesPage` | Files tab page |
| `CnSettingsPage` | Settings page shell |
| `CnChatPage` | Talk/chat embed page |
| `CnMapPage` | Map embed page |
| `CnFeaturesAndRoadmapView` | Feature request and roadmap overview |

**Integration leaves** (used via the registry, not directly):
`CnFilesCard`, `CnNotesCard`, `CnTagsCard`, `CnTasksCard`, `CnAuditTrailCard` — plus Talk, Deck, Calendar, Polls, Forms, Photos, Bookmarks, Collectives, Maps, Analytics, Cospend, XWiki, OpenProject, TimeTracker, Flow tabs and cards.

---

### New store plugins

| Plugin | Description |
|--------|-------------|
| `logsPlugin(options)` | Fetches and exposes logs for a parent object. `options.parentIdParam` is required. |
| `liveUpdatesPlugin` | Real-time collection updates via `@nextcloud/notify_push`. |
| `registerMappingPlugin` | Register mapping state and actions. |

All three are passed in the `plugins` array of `createObjectStore` or `createCrudStore`. Existing plugin calls are unchanged.

---

### New composables

| Composable | Description |
|------------|-------------|
| `useDetailView` | Load, edit, delete state management for detail pages |
| `useDashboardView` | Widget definitions, layout, NC widget loading, add/remove/persist |
| `useContextMenu` | Right-click context menu positioning and state |
| `useFileSelection` | File upload/drop handling |

---

### New utilities

| Export | Description |
|--------|-------------|
| `safeHref(url)` | Validates a URL for `:href` bindings. Rejects `javascript:`, `data:`, `vbscript:`, and protocol-relative `//` URLs — returns `'#'`. |
| `safeImageSrc(url)` | Validates a URL for `<img src>`. Allows `https:`, `http:`, and safe `data:image/...` URIs only. |
| `safeSvgPath(d)` | Validates an SVG `path[d]` attribute against an allowlist of SVG path characters. |
| `fieldsFromSchema(schema, options)` | Generate form field definitions from JSON Schema |
| `filtersFromSchema(schema, options)` | Generate filter definitions from JSON Schema |

---

### Changes to existing components

**`CnIndexPage`** — large expansion, all backwards compatible
- New props (all have defaults): `register`, `schema` (now also accepts `string` for self-fetch mode), `filter`, `quickFilters`, `sidebar`, `searchValue`, `visibleColumns`, `activeFilters`, `cardComponent`, `headerActions`, `documentationUrl`, `showRequestFeature`, `showViewAction`
- Self-fetch mode: when `register` + `schema` are passed without `store`/`objects`, the page fetches its own data and the form dialog saves directly — no `@create`/`@edit` handler needed in the parent
- Mass action dialogs now built-in (Delete, Copy, Export, Import)

**`CnFormDialog`** — all backwards compatible
- `cancelLabel` and `closeLabel` now use `t('nextcloud-vue', ...)` for translation by default
- New prop: `referenceContext` (for integration widgets in schema reference properties)
- Conditional field visibility: fields with `visibleWhen` conditions now hide/show reactively and clear their values when hidden

**`CnDashboardPage`** — all backwards compatible
- New props (all have defaults): `surface`, `integrationContext`, `dateRange`, `showRefresh`, `showRequestFeature`, `documentationUrl`, `pageId`, `content`

**`CnDataTable`** — all backwards compatible
- `columns` prop now accepts bare string keys (`['title', 'status']`) in addition to full column objects. String keys are enriched from `schema` when one is provided.

**`CnSettingsSection`** — visual change only
- Heading and actions are now in a flex row. No prop changes.

---

### Security

- All components that bind user-controlled URLs to `:href` or `src` now call `safeHref`/`safeImageSrc` internally
- `cnRenderMarkdown` uses DOMPurify with a protocol-allowlist that blocks `javascript:`, `data:`, and protocol-relative URLs
- GraphQL composable validates query strings before dispatch
- URL path segments are validated with `encodeURIComponent` before use in API calls
