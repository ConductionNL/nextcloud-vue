---
status: reviewed
---

# getting-started-guide Specification

## Purpose

Provides a quick-start guide for building a new Nextcloud app using `@conduction/nextcloud-vue`. Walks developers through the minimum steps to go from zero to a working app with a list page, detail view, and sidebar navigation.

## Requirements

### Requirement: Getting Started Page

The docs site MUST include a `docs/getting-started.md` page as the main entry point for new developers. This page MUST be linked from the homepage "Get Started" button and appear first in the sidebar.

The page MUST cover these steps in order:
1. **Prerequisites** -- Nextcloud dev environment, Node.js 18+, OpenRegister app installed
2. **Install the library** -- `npm install @conduction/nextcloud-vue`
3. **Webpack configuration** -- Required aliases for `@conduction/nextcloud-vue`, deduplication aliases for `vue`, `pinia`, `@nextcloud/vue`
4. **CSS import** -- Import `@conduction/nextcloud-vue/src/css/index.css` or note that barrel import auto-includes it
5. **Register icons** -- Import `registerIcons` and register the MDI icons used by your schemas
6. **Create the object store** -- Use `createObjectStore` with plugins
7. **Create a settings store** -- Fetch from `/apps/{appname}/api/settings` and register object types
8. **Set up Vue Router** -- Hash mode, routes per entity type
9. **Build your first list page** -- Use `CnIndexPage` with a schema
10. **Build your first detail view** -- Use store methods and `useDetailView` composable for CRUD

#### Scenario: Developer follows the guide end to end

- GIVEN a developer with a fresh Nextcloud app scaffold
- WHEN they follow the getting-started guide step by step from prerequisites through first detail view
- THEN they SHALL have a working app with navigation, a list page using CnIndexPage, and a detail view using store CRUD methods

#### Scenario: Developer can skip to a specific step

- GIVEN a developer who already has an app with routing set up
- WHEN they want to add CnIndexPage to an existing view
- THEN the guide MUST have clear step headings that allow jumping to step 9 directly

#### Scenario: Each step has a code example

- GIVEN a developer reads any step in the guide
- WHEN they look for implementation details
- THEN every step MUST include at least one code snippet showing the exact code to write or modify

### Requirement: Prerequisites Section

The prerequisites section MUST clearly list:
- A running Nextcloud development environment (link to Nextcloud dev docs)
- Node.js 18+ and npm
- The OpenRegister app installed and enabled in Nextcloud
- A Nextcloud app scaffold (link to `@nextcloud/webpack-vue-config` documentation)
- Pinia installed (`npm install pinia`)

#### Scenario: Developer checks prerequisites

- GIVEN a developer reads the prerequisites
- WHEN they verify their environment
- THEN they SHALL know exactly which software versions and Nextcloud apps are required before proceeding

#### Scenario: Links to external setup guides

- GIVEN a developer does not have a Nextcloud dev environment
- WHEN they read the prerequisites
- THEN they SHALL find a link to the official Nextcloud developer manual for setting up a development environment

#### Scenario: Pinia dependency is explicit

- GIVEN a developer reads the prerequisites
- WHEN they check their package.json
- THEN the guide SHALL explicitly state that `pinia` must be installed as a peer dependency and explain why (the library's stores depend on it)

### Requirement: Webpack Configuration Section

The getting-started guide MUST include a dedicated section on webpack configuration explaining:
- The `@conduction/nextcloud-vue` source alias (pointing to `../nextcloud-vue/src` for local dev or the npm package for production)
- The deduplication aliases for `vue`, `pinia`, `@nextcloud/vue` -- WHY they are needed (prevents dual-instance bugs: dual Pinia stores losing state, broken Vue reactivity, blank screens)
- The `VueLoaderPlugin` replacement pattern (replace the default, not push a second instance)
- The `sideEffects: true` setting in package.json -- WHY it matters (webpack tree-shakes barrel imports otherwise, breaking CSS auto-import from `src/index.js`)

#### Scenario: Developer configures webpack correctly

- GIVEN a developer reads the webpack section
- WHEN they apply the alias configuration to their `webpack.config.js`
- THEN their build SHALL resolve `@conduction/nextcloud-vue` imports without dual-instance issues

#### Scenario: Developer understands WHY deduplication is needed

- GIVEN a developer reads the deduplication explanation
- WHEN they encounter the aliases for vue, pinia, and @nextcloud/vue
- THEN the guide MUST explain that without deduplication, the library and app load separate instances causing state loss, reactivity breakage, and blank screens

#### Scenario: Complete webpack.config.js example

- GIVEN a developer reads the webpack section
- WHEN they look at the code example
- THEN they SHALL see a complete `webpack.config.js` file (not a fragment) that extends `@nextcloud/webpack-vue-config` with all required aliases, VueLoaderPlugin replacement, and resolve configuration

#### Scenario: sideEffects explanation prevents CSS issues

- GIVEN a developer reads the sideEffects section
- WHEN they understand the tree-shaking risk
- THEN the guide SHALL show the exact `package.json` entry (`"sideEffects": true` or `"sideEffects": ["*.css"]`) needed to prevent CSS from being tree-shaken

### Requirement: Icon Registration Section

The guide MUST explain the icon registration pattern:
- Import `registerIcons` from `@conduction/nextcloud-vue`
- Import MDI icons from `@mdi/js` using PascalCase names
- Call `registerIcons({ iconName: mdiIconPath })` at app startup
- Explain the PascalCase resolution: schema icon `mdi:account-group` resolves to `AccountGroup`
- Explain the `HelpCircleOutline` fallback for unregistered icons

#### Scenario: Developer registers icons for their schemas

- GIVEN a developer's schemas reference MDI icons (e.g., `mdi:account-group`)
- WHEN they follow the icon registration step
- THEN they SHALL have a working `registerIcons()` call that maps schema icon names to MDI SVG paths

#### Scenario: Fallback icon is explained

- GIVEN a developer does not register all icons used by their schemas
- WHEN an unregistered icon is referenced
- THEN the guide SHALL explain that CnIcon falls back to HelpCircleOutline (question mark icon) for any unregistered icon name

#### Scenario: Icon import pattern is copy-pasteable

- GIVEN a developer copies the icon registration example
- WHEN they paste it into their `main.js`
- THEN it SHALL compile without errors assuming `@mdi/js` is installed

### Requirement: Object Store Setup Section

The guide MUST explain how to create and configure the object store:
- Import `createObjectStore` and desired plugins from `@conduction/nextcloud-vue`
- Call `createObjectStore('object', { plugins: [...] })` with at least `filesPlugin()`, `auditTrailsPlugin()`, `relationsPlugin()`, `registerMappingPlugin()`
- Explain what each plugin adds (files: attachment CRUD, auditTrails: change history, relations: $ref following, registerMapping: register/schema URL mapping)
- Show how to register object types with `store.registerObjectType(slug, { register, schema })`

#### Scenario: Developer creates a store with plugins

- GIVEN a developer follows the store setup section
- WHEN they create a store with all four recommended plugins
- THEN they SHALL have a working Pinia store instance with CRUD methods plus file, audit trail, relation, and register mapping capabilities

#### Scenario: Developer registers object types

- GIVEN a developer has a store instance
- WHEN they follow the object type registration example
- THEN they SHALL understand that `registerObjectType('contact', { register: 'reg-uuid', schema: 'schema-uuid' })` maps the slug 'contact' to specific OpenRegister register/schema UUIDs

#### Scenario: Plugin descriptions are practical

- GIVEN a developer reads the plugin descriptions
- WHEN they decide which plugins to include
- THEN each plugin description SHALL explain in one sentence what API methods it adds and when an app would need it

### Requirement: Settings Store Section

The guide MUST explain how to create a settings store:
- Define a Pinia store that fetches app configuration from `/apps/{appname}/api/settings`
- Show the `fetchSettings()` action that calls the API and stores register/schema mappings
- Explain how settings connect to objectStore type registration via `initializeStores()`
- Show the `initializeStores()` pattern that reads settings and calls `registerObjectType()` for each entity

#### Scenario: Developer creates a settings store

- GIVEN a developer follows the settings store section
- WHEN they create `store/modules/settings.js`
- THEN they SHALL have a Pinia store that fetches settings from their app's API endpoint

#### Scenario: Developer connects settings to object store

- GIVEN a developer has both a settings store and an object store
- WHEN they follow the `initializeStores()` example
- THEN they SHALL understand the flow: fetch settings -> extract register/schema mappings -> register each as an object type

#### Scenario: Settings store is complete and runnable

- GIVEN a developer copies the settings store example
- WHEN they paste it into their app
- THEN it SHALL work with any Conduction app that follows the standard settings API pattern

### Requirement: Vue Router Setup Section

The guide MUST explain Vue Router configuration for Nextcloud apps:
- Hash mode (required for Nextcloud app routing within the content area)
- Base route pattern: `/{appname}`
- Example routes with lazy-loaded view components
- Route params for detail views (e.g., `/:objectType/:id`)

#### Scenario: Developer sets up routing

- GIVEN a developer follows the router section
- WHEN they configure Vue Router
- THEN they SHALL have hash-mode routing with lazy-loaded views that works within the Nextcloud app content area

#### Scenario: Route examples match real app patterns

- GIVEN a developer reads the route examples
- WHEN they compare to actual Conduction apps (OpenRegister, Pipelinq)
- THEN the route structure MUST reflect the actual patterns used (e.g., `/contacts`, `/contacts/:id`)

#### Scenario: Lazy loading is explained

- GIVEN a developer reads the router section
- WHEN they see `() => import('./views/ContactList.vue')`
- THEN the guide SHALL explain that lazy loading reduces initial bundle size by loading views on demand

### Requirement: Minimal Working Example

The getting-started guide MUST include a complete minimal example showing:
- `main.js` with imports, `registerIcons`, Vue/Pinia setup, and router mount
- `App.vue` with `NcContent`, `NcAppNavigation` (MainMenu), and `<router-view />`
- `store/modules/object.js` with `createObjectStore` call
- `store/modules/settings.js` with settings fetch
- `store/store.js` with `initializeStores()` function
- `router/index.js` with Vue Router setup
- `views/EntityList.vue` using `CnIndexPage` with schema, objects, pagination, loading, and event handlers
- The register JSON structure showing how schemas and registers are defined

Code snippets SHALL be copy-pasteable -- not pseudocode. They MUST work with the current library API.

#### Scenario: Developer copies the minimal example

- GIVEN a developer copies all code snippets from the minimal example section
- WHEN they paste them into their Nextcloud app's `src/` directory and run `npm run build`
- THEN the app SHALL compile without errors (assuming correct dependency chain)

#### Scenario: main.js is complete

- GIVEN a developer reads the main.js example
- WHEN they review the file
- THEN they SHALL see Vue instantiation, Pinia creation, router injection, registerIcons call, and the root component mount

#### Scenario: App.vue shows the Nextcloud shell

- GIVEN a developer reads the App.vue example
- WHEN they review the template
- THEN they SHALL see NcContent wrapping NcAppNavigation and NcAppContent with a router-view, matching the standard Nextcloud app shell pattern

#### Scenario: EntityList.vue uses CnIndexPage

- GIVEN a developer reads the EntityList.vue example
- WHEN they review the component
- THEN they SHALL see CnIndexPage with schema, objects, pagination, loading props bound and @create, @edit, @delete, @refresh event handlers connected to store methods

#### Scenario: Register JSON structure is explained

- GIVEN a developer reads the register JSON section
- WHEN they review the structure
- THEN they SHALL understand how a register JSON file defines schemas (with properties), registers, and the relationship between them for auto-import on app install

### Requirement: First Detail View Section

The guide MUST include a step for building a detail view:
- Use `useDetailView` composable or direct store methods
- Show loading a single object by ID via `store.fetchSingle(type, id)`
- Show editing with `store.updateObject(type, id, data)`
- Show delete with `store.deleteObject(type, id)`
- Explain navigation back to the list after delete

#### Scenario: Developer builds a detail view

- GIVEN a developer has completed the list page step
- WHEN they follow the detail view section
- THEN they SHALL have a working detail view component that loads, displays, edits, and deletes a single object

#### Scenario: useDetailView composable is shown

- GIVEN a developer reads the detail view section
- WHEN they see the useDetailView example
- THEN they SHALL understand how the composable manages loading state, error handling, and CRUD operations for a single object

#### Scenario: Navigation between list and detail works

- GIVEN a developer has both list and detail views
- WHEN they click a row in CnIndexPage
- THEN the guide SHALL explain how @row-click navigates to the detail route using `router.push`

### Requirement: Sidebar Position

The getting-started page MUST use `sidebar_position: 1` frontmatter so it appears as the first item in the auto-generated sidebar, before architecture and component reference pages.

#### Scenario: Getting started appears first

- GIVEN a developer visits the docs site
- WHEN they look at the sidebar
- THEN "Getting Started" MUST be the first item

#### Scenario: Sidebar position is set in frontmatter

- GIVEN a developer reads the raw markdown of getting-started.md
- WHEN they check the YAML frontmatter
- THEN they SHALL see `sidebar_position: 1`

#### Scenario: No other page has position 1

- GIVEN all documentation pages have sidebar_position frontmatter
- WHEN the sidebar renders
- THEN only getting-started.md SHALL have position 1 and all other pages MUST have position 2 or higher

### Requirement: Troubleshooting Section

The getting-started guide MUST end with a troubleshooting section covering common issues:
- **Blank screen / no reactivity** -- Dual Vue instance from missing deduplication aliases
- **Pinia _s error** -- Dual Pinia instance from missing pinia alias
- **CSS not loading** -- Missing `sideEffects: true` in package.json
- **Icons showing question marks** -- Icons not registered via `registerIcons()`
- **API 401 errors** -- Missing or incorrect `buildHeaders()` usage
- **Objects not loading** -- Object type not registered via `registerObjectType()`

#### Scenario: Developer diagnoses blank screen

- GIVEN a developer sees a blank screen after adding the library
- WHEN they check the troubleshooting section
- THEN they SHALL find the "Dual Vue instance" explanation with the fix (add vue resolve alias to webpack config)

#### Scenario: Developer diagnoses missing CSS

- GIVEN a developer's components render without styles
- WHEN they check the troubleshooting section
- THEN they SHALL find the CSS loading issue with the fix (add `sideEffects: true` to package.json)

#### Scenario: Developer diagnoses Pinia error

- GIVEN a developer sees `_s is not defined` or similar Pinia errors
- WHEN they check the troubleshooting section
- THEN they SHALL find the dual Pinia instance explanation with the fix (add pinia resolve alias)

#### Scenario: Each issue has a symptom, cause, and fix

- GIVEN a developer reads any troubleshooting entry
- WHEN they review its content
- THEN each entry MUST have three parts: symptom (what the developer sees), cause (why it happens), and fix (exact code change needed)

### Requirement: Next Steps Section

The guide MUST end with a "Next Steps" section linking to:
- Component Reference -- for detailed per-component documentation
- Layout Patterns -- for common page layout compositions
- OpenRegister Integration -- for understanding the backend data flow
- Architecture Overview -- for understanding the library's design decisions
- Store Plugins -- for extending the object store

#### Scenario: Developer knows where to go after setup

- GIVEN a developer has completed the getting-started guide
- WHEN they read the Next Steps section
- THEN they SHALL find 5 links to deeper documentation topics with a one-sentence description of each

#### Scenario: Links are valid internal references

- GIVEN the Next Steps section contains links
- WHEN the Docusaurus site builds
- THEN all internal links MUST resolve to existing documentation pages without broken link warnings

#### Scenario: Next Steps match documentation structure

- GIVEN the docs site has sections for components, store, integrations, and architecture
- WHEN a developer reads Next Steps
- THEN each linked section SHALL correspond to an actual directory or page in the docs structure

## MODIFIED Requirements

_(none -- all new)_

## REMOVED Requirements

_(none -- all new)_

---

## Current Implementation Status

**Mostly implemented.** The getting-started guide exists at `docs/getting-started.md` and covers most specified steps.

**Getting Started Page (implemented at `docs/getting-started.md`):**
- Has `sidebar_position: 1` frontmatter -- appears first in sidebar
- Linked from homepage "Get Started" button (`/docs/getting-started`)
- Includes a "Current Status & Scope" admonition explaining OpenRegister-first development

**Steps covered (all present):**
1. Prerequisites -- Nextcloud dev environment, Node.js 18+, OpenRegister app, scaffold
2. Install -- `npm install @conduction/nextcloud-vue`
3. Webpack configuration -- Library alias, deduplication, VueLoaderPlugin, sideEffects
4. Register icons -- `registerIcons()` with MDI icons
5. Create object store -- `createObjectStore` with plugins
6. Create settings store -- `useSettingsStore` with `fetchSettings()`
7. Initialize stores -- `initializeStores()` function
8. Vue Router -- Hash mode with example routes
9. First list page -- CnIndexPage example

**Not yet implemented / deviations:**
- No complete `main.js` example (imports, Vue setup, router mount)
- No `App.vue` example showing NcContent/NcAppNavigation shell
- No register JSON structure example
- No detail view step (step 10)
- No troubleshooting section
- Next Steps section exists but may not cover all 5 linked topics

## Standards & References

- **Nextcloud App Development** -- https://docs.nextcloud.com/server/stable/developer_manual/app_development/index.html
- **Webpack** -- Uses `@nextcloud/webpack-vue-config` as the base webpack configuration
- **Pinia** -- Store framework used for state management
- **Vue Router** -- Hash mode routing (standard for Nextcloud apps)
- **OpenRegister** -- Primary backend; schemas, registers, and objects API
- **@mdi/js** -- Material Design Icons as JavaScript SVG paths

## Specificity Assessment

- **Specific enough?** Yes, each step has clear content requirements, code examples are specified as copy-pasteable, and troubleshooting covers the most common issues.
- **Missing/ambiguous:**
  - Does not specify whether the guide should target Vue 2 Options API or Composition API (both are used in the codebase)
  - The register JSON structure format is not fully defined
  - Dashboard setup is not included (could be a separate guide)
- **Open questions:**
  - Should the guide include a section on using `useListView` composable (new simplified API) alongside or instead of the manual CnIndexPage wiring?
  - Should there be a "Build your first dashboard" step using CnDashboardPage?
  - Should the guide address apps that do NOT use OpenRegister as a backend?
