# Unify component documentation into a single Docusaurus site

## Why

Today the library publishes documentation through **two parallel systems**, neither of which can serve a developer end-to-end:

- **Docusaurus** at https://nextcloud-vue.conduction.nl/ — the broader "how to design and build apps with this library" surface (architecture, layouts, i18n, integrations, store, getting-started, hand-written component pages). Until [#135](https://github.com/ConductionNL/nextcloud-vue/pull/135) the root URL was rendering the official "site did not load properly" red banner because of a CNAME-vs-baseUrl mismatch — the entry point of our docs has been broken.
- **Vue Styleguidist** at https://nextcloud-vue.conduction.nl/beta/styleguide/ and `/dev/styleguide/` — the live, interactive component playground. Auto-introspects SFC props/slots/events from source, ships mocks for runtime data, exposes design-token + animation reference pages.

The two are almost orthogonal in content (no real duplication beyond the per-component overlap), but they're discovered separately, themed differently, and have no shared navigation. A developer landing on either site has to know the other exists and what to look for in each. Worse, the per-component pages exist in **both** systems with different shapes — markdown stub in Docusaurus vs auto-generated playground in Styleguidist — so the canonical source of truth for each component is genuinely unclear.

The library is also moving fast (1.0.0-beta.1 just shipped, manifest renderer landed, dashboard grid in flight). Every doc gap doubles when it has to be filed in two places. Hand-maintaining per-component prop tables in `docs/components/*.md` while the SFC source is the real source of truth has already drifted; [scripts/check-docs.js](../../../scripts/check-docs.js) only enforces that the file *exists* and that prop/slot **names** appear somewhere in the prose — not that types, defaults, or descriptions are accurate.

## What Changes

**Single destination.** The root URL `https://nextcloud-vue.conduction.nl/` becomes a single Docusaurus site that owns all narrative + reference content. Vue Styleguidist remains live as the iframe target for live demos, deployed under `/styleguide/` (not removed; it stays as the playground runtime).

**Auto-generated reference sections.** Each per-component page (`docs/components/<name>.md`) becomes a hybrid:
- Hand-written narrative (purpose, when to use, design rationale, examples) at the top — the part Styleguidist can't do well today.
- Auto-generated props / events / slots tables at the bottom, produced by `vue-docgen-cli` from the SFC source as a build-time prebuild step. Lives in `docs/components/_generated/<name>.md` partials, included via MDX import.

**Live playground via embedded iframe.** A new `<Playground component="CnDataTable" />` MDX component renders an iframe pointed at `/styleguide/#!/CnDataTable`. Visitors stay on the Docusaurus page; the iframe gives them the Styleguidist sandbox without leaving. Single visible URL, two builds under the hood.

**Spec drift cleanup.** The existing [docs-site-infrastructure spec](../../../specs/docs-site-infrastructure/spec.md) hard-codes `url: 'https://conductionnl.github.io'` + `baseUrl: '/nextcloud-vue/'`, which is what made the root broken in the first place. The CNAME-driven custom-domain config from #135 becomes the spec.

**Branch-protection awareness.** The `feature/styleguide-component-fixes` branch (the live source of `/beta/styleguide/`) stays around as a backup reference but is no longer the integration branch — its 13 commits of component fixes flow back through the standard `feature → development → beta` flow ([#134](https://github.com/ConductionNL/nextcloud-vue/pull/134)).

## What Does Not Change (deliberate)

- **Vue Styleguidist itself.** No migration to Storybook 8, Histoire, or VitePress. Styleguidist is unmaintained but works for our Vue 2.7 lib; replacing it is a separate decision that should wait for a Vue 3 migration of the library.
- **MDX-native live Vue components.** `docusaurus-plugin-usevue` exists but is unmaintained, targets Docusaurus 2, and would couple Vue 2 + React 18 + MDX 3 inside a single bundle — a compatibility minefield. The iframe approach buys us the same UX without the risk; if the lib migrates to Vue 3 we can revisit native MDX live demos.
- **The hand-maintained narrative content.** Architecture, layouts, store, i18n, integrations, getting-started — all stay hand-written. Auto-generation only applies to the per-component prop/event/slot reference tables.
- **The `feature/styleguide-component-fixes` branch.** Kept as an explicit rollback / archival reference, per direct user instruction.
