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
