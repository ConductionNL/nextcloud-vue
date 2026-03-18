# getting-started-guide Specification

## Purpose

Provides a quick-start guide for building a new Nextcloud app using `@conduction/nextcloud-vue`. Walks developers through the minimum steps to go from zero to a working app with a list page, detail view, and sidebar navigation.

## ADDED Requirements

### Requirement: Getting Started Page

The docs site MUST include a `docs/getting-started.md` page as the main entry point for new developers. This page MUST be linked from the homepage "Get Started" button and appear first in the sidebar.

The page MUST cover these steps in order:
1. **Prerequisites** — Nextcloud dev environment, Node.js 18+, OpenRegister app installed
2. **Install the library** — `npm install @conduction/nextcloud-vue`
3. **Webpack configuration** — Required aliases for `@conduction/nextcloud-vue`, deduplication aliases for `vue`, `pinia`, `@nextcloud/vue`
4. **Register icons** — Import `registerIcons` and register the MDI icons used by your schemas
5. **Create the object store** — Use `createObjectStore` with plugins
6. **Create a settings store** — Fetch from `/apps/{appname}/api/settings` and register object types
7. **Set up Vue Router** — Hash mode, routes per entity type
8. **Build your first list page** — Use `CnIndexPage` with a schema
9. **Build your first detail view** — Use store methods for CRUD

#### Scenario: Developer follows the guide

- GIVEN a developer with a fresh Nextcloud app scaffold
- WHEN they follow the getting-started guide step by step
- THEN they have a working app with navigation, a list page using CnIndexPage, and a detail view

### Requirement: Webpack Configuration Section

The getting-started guide MUST include a dedicated section on webpack configuration explaining:
- The `@conduction/nextcloud-vue` source alias (pointing to `../nextcloud-vue/src` for local dev or the npm package for production)
- The deduplication aliases for `vue`, `pinia`, `@nextcloud/vue` — WHY they are needed (prevents dual-instance bugs: dual Pinia stores, broken Vue reactivity)
- The `VueLoaderPlugin` replacement pattern (replace, not push)
- The `sideEffects: true` setting in package.json — WHY it matters (webpack tree-shakes barrel imports otherwise, breaking CSS)

#### Scenario: Developer configures webpack correctly

- GIVEN a developer reads the webpack section
- WHEN they apply the alias configuration to their `webpack.config.js`
- THEN their build resolves `@conduction/nextcloud-vue` imports without dual-instance issues

### Requirement: Minimal Working Example

The getting-started guide MUST include a complete minimal example showing:
- `main.js` with imports, `registerIcons`, Vue/Pinia setup, and router mount
- `App.vue` with `NcContent`, `NcAppNavigation` (MainMenu), and `<router-view />`
- `store/modules/object.js` with `createObjectStore` call
- `views/EntityList.vue` using `CnIndexPage`
- The register JSON structure

Code snippets SHALL be copy-pasteable — not pseudocode. They MUST work with the current library API.

#### Scenario: Developer copies the minimal example

- GIVEN a developer copies the code snippets from the minimal example
- WHEN they paste them into their Nextcloud app and run `npm run build`
- THEN the app compiles without errors (assuming the dependency chain is correct)

### Requirement: Sidebar Position

The getting-started page MUST use `sidebar_position: 1` frontmatter so it appears as the first item in the auto-generated sidebar, before architecture and component reference pages.

#### Scenario: Getting started appears first

- GIVEN a developer visits the docs site
- WHEN they look at the sidebar
- THEN "Getting Started" is the first item

## MODIFIED Requirements

_(none — all new)_

## REMOVED Requirements

_(none — all new)_

---

### Current Implementation Status

**Fully implemented.** The getting-started guide exists at `docs/getting-started.md` and covers all specified steps.

**Getting Started Page (implemented at `docs/getting-started.md`):**
- Has `sidebar_position: 1` frontmatter — appears first in sidebar
- Linked from homepage "Get Started" button (`/docs/getting-started`)
- Includes a "Current Status & Scope" admonition explaining OpenRegister-first development

**Steps covered (all present):**
1. **Prerequisites** — Nextcloud dev environment, Node.js 18+, OpenRegister app, Nextcloud app scaffold (with link to Nextcloud App Development docs)
2. **Install the library** — `npm install @conduction/nextcloud-vue`
3. **Webpack configuration** — Library alias, deduplication aliases (vue, pinia, @nextcloud/vue), VueLoaderPlugin replacement, `sideEffects: true`. Includes admonition explaining WHY deduplication matters (dual Pinia _s errors, dual Vue blank pages)
4. **Register icons** — `registerIcons()` with MDI icon imports, explains PascalCase resolution and HelpCircleOutline fallback
5. **Create the object store** — `createObjectStore` with `filesPlugin`, `auditTrailsPlugin`, `relationsPlugin`, `registerMappingPlugin`
6. **Create a settings store** — `useSettingsStore` with `fetchSettings()` action
7. **Initialize stores** — `initializeStores()` function that registers object types from settings
8. **Set up Vue Router** — Hash mode, example routes with lazy-loaded views
9. **Build your first list page** — Full Vue SFC example using `CnIndexPage` with schema, objects, pagination, loading, and event handlers

**Code snippets are copy-pasteable** — real imports, real component names, real API patterns.

**Minimal Working Example (implemented):**
- Shows `store/modules/object.js` with `createObjectStore`
- Shows `store/modules/settings.js` with settings fetch
- Shows `store/store.js` with `initializeStores()`
- Shows `router/index.js` with Vue Router setup
- Shows `views/ContactList.vue` with `CnIndexPage` usage
- Does NOT show `main.js` or `App.vue` explicitly (these are implied)

**Next Steps section links to:**
- Layouts, Component Reference, OpenRegister Integration, Architecture Overview

**Not yet implemented / deviations:**
- The spec requires a `main.js` example with imports, `registerIcons`, Vue/Pinia setup, and router mount — the guide has `registerIcons` but not a complete `main.js` file
- The spec requires an `App.vue` example with `NcContent`, `NcAppNavigation` (MainMenu), and `<router-view />` — not present
- The spec requires "the register JSON structure" to be shown — not present
- The guide does not show a detail view example (spec step 9: "Build your first detail view")

### Standards & References

- **Nextcloud App Development** — Links to https://docs.nextcloud.com/server/stable/developer_manual/app_development/index.html
- **Webpack** — Uses `@nextcloud/webpack-vue-config` as the base webpack configuration
- **Pinia** — Store framework used for state management
- **Vue Router** — Hash mode routing (standard for Nextcloud apps)
- **OpenRegister** — Primary backend; schemas, registers, and objects API

### Specificity Assessment

- **Specific enough?** Yes, the guide requirements are detailed and the implementation closely follows them.
- **Missing/ambiguous:**
  - No `main.js` with full Vue/Pinia bootstrap code
  - No `App.vue` example showing the overall app shell
  - No register JSON structure example
  - No detail view step (spec step 9)
  - The guide does not mention `useDashboardView` or dashboard setup
  - No mention of CSS import (`@conduction/nextcloud-vue/css/index.css`) in the getting-started steps — the guide's `registerIcons` example imports it but the step list does not call it out
- **Open questions:**
  - Should the guide include a section on using the `useListView` composable (new API) to simplify the list page example?
  - Should there be a "Build your first dashboard" step?
  - Should the guide address apps that do NOT use OpenRegister as a backend?
