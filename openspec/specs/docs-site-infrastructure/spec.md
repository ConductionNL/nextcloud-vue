---
status: reviewed
---

# docs-site-infrastructure Specification

## Purpose

Defines the Docusaurus project setup, build pipeline, GitHub Pages deployment, and site structure for the `@conduction/nextcloud-vue` documentation website. This is the foundation that all other documentation specs build on.

## Requirements

### Requirement: Docusaurus Project Structure

The docs site MUST use Docusaurus 3.x with the following directory layout:
- `nextcloud-vue/docusaurus/` -- Docusaurus config, custom homepage, theme, static assets
- `nextcloud-vue/docs/` -- Markdown content (referenced by Docusaurus via `path: '../docs'`)

The Docusaurus project MUST be isolated from the library's own build -- it SHALL have its own `package.json` and MUST NOT add dependencies to the library's root `package.json`.

#### Scenario: Fresh clone and build

- GIVEN a developer clones the `nextcloud-vue` repository
- WHEN they run `cd docusaurus && npm ci --legacy-peer-deps && npm run build`
- THEN a static site SHALL be generated in `docusaurus/build/` with an `index.html`

#### Scenario: Local development server

- GIVEN a developer is working on documentation
- WHEN they run `cd docusaurus && npm start`
- THEN a local dev server MUST start with hot-reload for markdown changes in `../docs/`

#### Scenario: Library build is not affected

- GIVEN a developer runs the library build from the root (`npm run build`)
- WHEN the build completes
- THEN it SHALL NOT include Docusaurus dependencies and the Docusaurus directory SHALL NOT affect the library bundle

#### Scenario: Docusaurus directory structure is complete

- GIVEN the `docusaurus/` directory exists
- WHEN a developer inspects its contents
- THEN they SHALL find `docusaurus.config.js`, `package.json`, `package-lock.json`, `sidebars.js`, `src/pages/`, `src/css/`, `src/components/`, and `static/`

### Requirement: Docusaurus Configuration

The `docusaurus.config.js` MUST configure:
- `title`: `@conduction/nextcloud-vue`
- `tagline`: A short description of the library's purpose (shared Vue components for Nextcloud apps built on OpenRegister)
- `url`: `https://nextcloud-vue.conduction.nl` (the production custom domain set in `gh-pages` `CNAME`)
- `baseUrl`: `/` (root — the custom domain serves Docusaurus at the apex, not under a project subpath)
- `organizationName`: `ConductionNL`
- `projectName`: `nextcloud-vue`
- `editUrl`: A function form `({ docPath }) => \`https://github.com/ConductionNL/nextcloud-vue/edit/beta/docs/${docPath}\`` — string-form editUrl produces broken `tree/<branch>/docusaurus/../docs/...` links because the docs `path` is `'../docs'`; a function form sidesteps the relpath doubling
- Docs preset with `path: '../docs'` and an explicit IA in `sidebars.js` (Phase 5 of unify-component-docs replaced flat autogen with intent-grouped categories: Getting Started, Architecture, Building Apps, Components, Composables, Utilities, Design Tokens)
- Mermaid theme support via `@docusaurus/theme-mermaid`
- `themeConfig.playground.styleguideUrl` resolved from `process.env.STYLEGUIDE_URL || '/styleguide'` — read by the [Live-demo Playground component](#requirement-live-demo-playground-component)
- Navbar with Documentation link and GitHub repository link (no explicit Styleguide link — the standalone styleguide URL is reachable by deep-linking only, surfaced as a `:::tip` on the components index page)
- Footer with Docs, Community, and Related Projects sections
- Prism syntax highlighting for code blocks with GitHub (light) and Dracula (dark) themes

#### Scenario: Custom-domain assets resolve at root

- GIVEN the deployed `gh-pages` build is served at `https://nextcloud-vue.conduction.nl/`
- WHEN a browser loads the homepage
- THEN every `<link>` `href` and `<script>` `src` MUST resolve to a path starting with `/` (root), not `/nextcloud-vue/`, and the page MUST render without the official "Your Docusaurus site did not load properly" red banner

#### Scenario: Edit links resolve cleanly

- GIVEN a published docs page (e.g. `/docs/components/cn-data-table`)
- WHEN a reader clicks "Edit this page"
- THEN they MUST land on `https://github.com/ConductionNL/nextcloud-vue/edit/beta/docs/components/cn-data-table.md` with no `..` segments in the URL

#### Scenario: Navbar navigation

- GIVEN a user visits the documentation site
- WHEN they look at the navbar
- THEN they SHALL see the site title, a "Documentation" link pointing to docs/getting-started, and a "GitHub" link to the ConductionNL/nextcloud-vue repository

#### Scenario: Footer links

- GIVEN a user scrolls to the footer
- WHEN they view the footer sections
- THEN they SHALL see three sections: Docs (Getting Started, Components, Architecture), Community (GitHub, Conduction), and Related (Nextcloud Vue Components, Layout Components, App Development docs)

#### Scenario: Mermaid diagrams render

- GIVEN a documentation page contains a Mermaid code fence
- WHEN the page renders
- THEN the Mermaid diagram MUST render as an SVG diagram, not raw text

#### Scenario: Code blocks have syntax highlighting

- GIVEN a documentation page contains a JavaScript code fence
- WHEN the page renders in light mode
- THEN the code block MUST use the GitHub Prism theme with proper syntax coloring

#### Scenario: Code blocks in dark mode

- GIVEN a developer views the site in dark mode
- WHEN they look at a code block
- THEN the code block MUST use the Dracula Prism theme for dark-mode-appropriate syntax coloring

### Requirement: Custom Homepage

The site MUST have a custom homepage (`docusaurus/src/pages/index.js`) with:
- A hero banner showing the library name and tagline
- A "Get Started" button linking to `/docs/getting-started` (root-relative; resolves correctly under both the `baseUrl: '/'` production deploy and a local `npm start` server)
- A feature grid highlighting 3 key aspects of the library: Schema-Driven Components, OpenRegister Integration, and NL Design System Support

#### Scenario: Homepage loads

- GIVEN a user navigates to the site root (`https://nextcloud-vue.conduction.nl/`)
- WHEN the page renders
- THEN they SHALL see the hero banner with library name, tagline, a "Get Started" button, and 3 feature cards below

#### Scenario: Get Started button navigates correctly

- GIVEN a user is on the homepage
- WHEN they click the "Get Started" button
- THEN they MUST be navigated to `/docs/getting-started`

#### Scenario: Feature cards describe key library capabilities

- GIVEN a user reads the feature grid
- WHEN they examine the three cards
- THEN they SHALL see descriptions of: (1) schema-driven components that auto-generate UIs from JSON Schema, (2) OpenRegister integration for backend CRUD, and (3) NL Design System theming compatibility

### Requirement: Custom Theme CSS

The site MUST include a `docusaurus/src/css/custom.css` with:
- The Open Webconcept green color scheme (primary `#2fb298`)
- Poppins font family
- Dark mode support with appropriate color adjustments
- Consistent styling with other Conduction documentation sites (Pipelinq, OpenRegister)

#### Scenario: Visual consistency with Conduction docs

- GIVEN a user visits the nextcloud-vue docs site
- WHEN they compare the visual styling with the Pipelinq docs site
- THEN the color scheme, typography, and dark mode behavior MUST be consistent

#### Scenario: Primary color is Open Webconcept green

- GIVEN the site loads with default light mode
- WHEN a developer inspects the CSS custom properties
- THEN `--ifm-color-primary` SHALL be set to `#2fb298` or a visually equivalent shade

#### Scenario: Dark mode has proper contrast

- GIVEN a user switches to dark mode
- WHEN they view the site
- THEN all text MUST meet WCAG AA contrast ratios against the dark background

### Requirement: GitHub Pages Deployment

The repository MUST ship three GitHub Actions workflows that publish to `gh-pages`:

- `.github/workflows/documentation.yml` — triggers on push to `main`. Builds Docusaurus AND Vue Styleguidist, copies the styleguide build into `docusaurus/build/styleguide/`, deploys to `gh-pages` root using `peaceiris/actions-gh-pages@v3` with `keep_files: true`. Verifies `index.html` exists. Creates `.nojekyll`.
- `.github/workflows/documentation-beta.yml` — triggers on push to `beta`. Builds Vue Styleguidist only, deploys to `gh-pages:/beta/styleguide/` with `keep_files: true` (so the Docusaurus root is preserved).
- `.github/workflows/documentation-dev.yml` — triggers on push to `development`. Same shape as beta, deploys to `gh-pages:/dev/styleguide/`.

All workflows MUST use Node.js 20 minimum and `npm ci --legacy-peer-deps` for install (the lib uses Vue 2.7 alongside Vue 3 peer deps from `@nextcloud/files@4.x`). The CNAME for the custom domain (`nextcloud-vue.conduction.nl`) MUST be preserved across deploys via `keep_files: true`.

#### Scenario: Deploy from main republishes both Docusaurus and the styleguide

- GIVEN a merge into `main`
- WHEN `documentation.yml` runs
- THEN `gh-pages` MUST contain both the Docusaurus build at root AND `gh-pages:/styleguide/` (built from `styleguide/`), with `CNAME` preserved by `keep_files: true`

#### Scenario: Pre-existing /beta/styleguide/ survives a Docusaurus root deploy

- GIVEN `gh-pages` already contains `/beta/styleguide/` from a prior beta deploy
- WHEN a `main` push triggers `documentation.yml`
- THEN `/beta/styleguide/` MUST still be present after the deploy completes

#### Scenario: Pull request does not deploy

- GIVEN a developer opens a pull request targeting `main`
- WHEN the workflow triggers
- THEN the build SHALL run for validation but no deployment MUST occur

#### Scenario: Build verification catches errors

- GIVEN the Docusaurus build fails (e.g., broken markdown link)
- WHEN the workflow runs
- THEN the workflow MUST fail before deployment and report the build error

#### Scenario: Deployment uses .nojekyll

- GIVEN the deployment step runs
- WHEN files are pushed to the `gh-pages` branch
- THEN a `.nojekyll` file MUST be present in the root to prevent GitHub Pages from processing files with Jekyll

### Requirement: Sidebar Information Architecture

The sidebar MUST use an explicit `sidebars.js` configuration that groups docs by reader intent, not by source-folder layout. The seven top-level sections MUST be (in order):

1. **Getting Started** — single onboarding page
2. **Architecture** — concept-first explanations of how the library is built (autogen from `docs/architecture/`)
3. **Building Apps** — task-first guides containing nested sub-categories: Layouts, Cards, Integrations (incl. the i18n guide), Store, and the migrating-to-manifest single-doc entry
4. **Components** — 43 component pages (autogen from `docs/components/`, narrative + Playground + auto-generated reference partial)
5. **Composables** — `use*` hook pages (autogen from `docs/utilities/composables/`)
6. **Utilities** — pure-function helpers (explicit listing — autogen on `docs/utilities/` would nest composables under Utilities and duplicate them with the top-level Composables group)
7. **Design Tokens** — Nextcloud CSS variables every `Cn*` component reads

Sub-categories under Building Apps MUST use `autogenerated` from their source dir so adding a new layout / card / integration is one file. The top-level Components and Composables groups MUST also use `autogenerated`. The Utilities group MUST use explicit document IDs to avoid the composables-nesting issue.

`docs/i18n/` holds Docusaurus locale JSON, NOT user content. The actual i18n guide lives at `docs/integrations/i18n.md` and is reachable via Building Apps → Integrations. `sidebars.js` MUST NOT auto-generate a sidebar entry for `docs/i18n/`.

#### Scenario: Top-level groups appear in order

- GIVEN a user opens any docs page
- WHEN the left sidebar renders
- THEN the top-level entries MUST be (in order): Getting Started, Architecture, Building Apps, Components, Composables, Utilities, Design Tokens

#### Scenario: New component page appears in Components automatically

- GIVEN a developer adds a new markdown file to `docs/components/`
- WHEN the site rebuilds
- THEN the new page MUST appear under the Components sidebar section without any config changes

#### Scenario: New utility requires a one-line sidebar update

- GIVEN a developer adds `docs/utilities/new-helper.md`
- WHEN the site rebuilds
- THEN the new page does NOT appear in the Utilities sidebar UNTIL `'utilities/new-helper'` is added to the explicit listing in `sidebars.js`. The page IS still routable at `/docs/utilities/new-helper` even before the listing is updated.

#### Scenario: Sidebar ordering respects frontmatter inside autogen groups

- GIVEN two pages in `docs/components/` have `sidebar_position: 1` and `sidebar_position: 2` respectively
- WHEN the sidebar renders inside the Components category
- THEN the page with position 1 SHALL appear before the page with position 2

#### Scenario: docs/i18n/ does not produce a sidebar entry

- GIVEN `docs/i18n/nl/code.json` and other locale JSON files exist
- WHEN the build runs
- THEN no top-level `i18n` category SHALL appear in the sidebar, and the build SHALL NOT fail with "category has neither any subitem nor a link"

### Requirement: Static Assets

The `docusaurus/static/` directory MUST contain:
- `img/logo.svg` -- The library or Conduction logo used in the navbar
- `img/screenshots/` -- Directory for component screenshots referenced by docs pages

#### Scenario: Logo renders in navbar

- GIVEN the site is loaded
- WHEN the navbar renders
- THEN the logo image from `static/img/logo.svg` MUST be displayed next to the site title

#### Scenario: Screenshots are served correctly

- GIVEN a component doc page references a screenshot with `![CnDataTable](../assets/components/cn-data-table.png)`
- WHEN the page renders
- THEN the image MUST load without 404 errors

### Requirement: Search Functionality

The docs site MUST support full-text search so developers can find content across all documentation pages. This MAY be implemented via Docusaurus local search plugin, Algolia DocSearch, or a custom search implementation.

#### Scenario: Developer searches for a component

- GIVEN a developer uses the search bar
- WHEN they type "DataTable"
- THEN search results MUST include the CnDataTable component reference page

#### Scenario: Developer searches for a concept

- GIVEN a developer uses the search bar
- WHEN they type "faceting"
- THEN search results MUST include the OpenRegister integration page and any component pages mentioning faceting

#### Scenario: Search works across all doc sections

- GIVEN a developer searches for "createObjectStore"
- WHEN results appear
- THEN results SHALL include pages from store reference, getting-started guide, and integration guides that mention createObjectStore

### Requirement: Code Example Copy Button

All code blocks in the documentation MUST have a copy-to-clipboard button that appears on hover. This is provided by Docusaurus's default theme and MUST NOT be disabled.

#### Scenario: Developer copies a code example

- GIVEN a developer hovers over a code block on a component page
- WHEN they click the copy button
- THEN the entire code block content MUST be copied to the clipboard

#### Scenario: Copy button does not include line numbers

- GIVEN a code block with line numbers displayed
- WHEN the developer clicks the copy button
- THEN only the code content SHALL be copied, not the line numbers

#### Scenario: Copy button provides feedback

- GIVEN a developer clicks the copy button
- WHEN the content is copied
- THEN the button MUST show a "Copied!" confirmation state briefly before reverting

### Requirement: Mobile Responsive Layout

The documentation site MUST be usable on mobile devices with a responsive sidebar that collapses to a hamburger menu, readable code blocks with horizontal scrolling, and properly sized images.

#### Scenario: Mobile sidebar navigation

- GIVEN a user visits the docs site on a mobile device (viewport < 768px)
- WHEN they tap the hamburger menu
- THEN the sidebar MUST slide in as an overlay with all navigation items accessible

#### Scenario: Mobile code blocks scroll horizontally

- GIVEN a user views a component page on mobile
- WHEN a code block is wider than the viewport
- THEN the code block MUST scroll horizontally without breaking the page layout

#### Scenario: Mobile images are responsive

- GIVEN a user views a page with a component screenshot on mobile
- WHEN the image renders
- THEN it MUST scale to fit the viewport width without requiring horizontal scroll

### Requirement: Documentation Versioning Strategy

The docs site MUST include versioning metadata in the Docusaurus config to support future version branches. Initially, only the "current" version MUST be served. When the library reaches v2.0, the site MUST support both v1 and v2 documentation.

#### Scenario: Current version serves without version prefix

- GIVEN the library is at v1.x
- WHEN a developer visits `/nextcloud-vue/docs/getting-started`
- THEN the current documentation SHALL render without requiring a version selector

#### Scenario: Version banner for pre-release docs

- GIVEN a "next" (unreleased) version of docs is configured
- WHEN a developer views the next version
- THEN a banner MUST appear indicating this documentation is for an unreleased version

#### Scenario: Future version selector

- GIVEN the library has released v2.0 and maintains v1 docs
- WHEN a developer visits the docs site
- THEN a version dropdown SHALL appear allowing navigation between v1 and v2 documentation

### Requirement: Auto-generated component reference

The Docusaurus build MUST produce per-component reference partials at `docs/components/_generated/<ComponentName>.md` from the SFC source via `vue-docgen-cli`. The pipeline MUST:

- Run as a `prebuild` npm script in `docusaurus/package.json` so `npm run build` triggers it automatically.
- Read all `src/components/Cn*/Cn*.vue` files relative to the docusaurus dir.
- Emit Docusaurus-safe markdown: any `{` / `}` characters in prop defaults, descriptions, or examples MUST be backslash-escaped (`\{` / `\}`); any `<` / `>` characters outside inline-code spans MUST be HTML-entity-encoded (`&lt;` / `&gt;`) to avoid MDX-3 JSX-element parsing errors on TS-style generics like `Array<{key, label}>`.
- Suppress empty sections (a component with no events emits no Events heading).
- Include a stable header comment so CI can detect drift.

The generated partials MUST be committed to git and MUST be regenerated whenever a component's `<script>` block changes. CI MUST fail any PR where regenerating the partials produces a non-empty diff.

#### Scenario: Prebuild produces a partial for every Cn* component

- GIVEN a fresh checkout
- WHEN a developer runs `cd docusaurus && npm install && npm run prebuild:docs`
- THEN every `src/components/Cn*/Cn*.vue` file MUST have a corresponding `docs/components/_generated/<name>.md` partial

#### Scenario: Stale partial fails CI

- GIVEN a PR modifies a Cn* SFC's prop list but does not regenerate the partial
- WHEN the `Frontend Quality` workflow runs
- THEN the job MUST fail with a diff showing the missing regeneration

#### Scenario: Generated partial uses Docusaurus-safe markdown

- GIVEN a component with a prop default value of `'{name}'` or a JSDoc description containing `Array<{key, label}>`
- WHEN the partial is generated
- THEN curly braces in non-code-fence positions MUST be backslash-escaped AND angle brackets in non-code-fence positions MUST be HTML-entity-encoded so that MDX-3 does not parse them as JSX expressions or elements

### Requirement: Live-demo Playground component

The site MUST ship `docusaurus/src/components/Playground.js` — an MDX-importable React component that embeds the Vue Styleguidist build via iframe. It MUST:

- Accept props `component: string` (component name, used to build the deep-link path), `path?: string` (override path, default `#!/{component}`), `height?: string` (default `'480px'`), `baseUrl?: string` (override the styleguide URL), `caption?: string`.
- Render an iframe with `src` resolving from `themeConfig.playground.styleguideUrl` (default `/styleguide`, overridable via `STYLEGUIDE_URL` env var for local dev).
- Render an "Open standalone" link below the iframe to the same URL.
- Auto-resize iframe height in response to a `playground:resize` `postMessage` event from the Styleguidist build (best-effort; if the styleguide doesn't post the message, the default `height` MUST still produce a usable embed).
- Wrap render in a `BrowserOnly` guard so SSR doesn't crash on `window` access.

#### Scenario: Component page embeds working playground

- GIVEN a published page at `/docs/components/cn-data-table` containing `<Playground component="CnDataTable" />`
- WHEN a developer visits the page
- THEN an iframe MUST load `/styleguide/#!/CnDataTable` and a working `CnDataTable` demo MUST be interactive within it

#### Scenario: Open standalone link works

- GIVEN a Playground iframe is rendered on a docs page
- WHEN the developer clicks "Open standalone"
- THEN a new tab MUST open at `/styleguide/#!/<component>` showing the same component view full-width

#### Scenario: Local development with separate styleguide server

- GIVEN a developer runs `cd styleguide && npm run server` (port 6060) in one terminal
- AND runs `cd docusaurus && STYLEGUIDE_URL=http://localhost:6060 npm start` (port 4000 or 3000) in another
- WHEN they visit a component page in Docusaurus
- THEN the Playground iframe MUST load from the styleguide dev server, not from a non-existent `/styleguide/` path on the Docusaurus origin

### Requirement: Vue Styleguidist build is preserved at /styleguide/, /beta/styleguide/, /dev/styleguide/

The `gh-pages` deploy MUST keep the Vue Styleguidist build available as a standalone URL at `/styleguide/` (production), `/beta/styleguide/` (beta channel), and `/dev/styleguide/` (development channel). The standalone URLs are the iframe targets used by the `<Playground>` MDX component AND remain accessible to power users who prefer the playground-only view.

The Styleguidist build MUST NOT be linked from the navbar after the unification. It is reachable by deep-linking only, surfaced as a `:::tip` admonition on the components index page.

#### Scenario: Styleguide URLs return 200

- GIVEN the deployed `gh-pages` site is live at `nextcloud-vue.conduction.nl`
- WHEN any of `/styleguide/`, `/beta/styleguide/`, `/dev/styleguide/` is requested
- THEN the response MUST be a 200 with the Styleguidist app shell

#### Scenario: Components index surfaces the standalone URL

- GIVEN a user opens `/docs/components/`
- WHEN the page renders
- THEN a `:::tip` admonition MUST appear at the top with a clickable link to `/styleguide/`

### Requirement: MDX 3 brace safety

All hand-written markdown content under `docs/` MUST treat literal `{` and `}` characters that are not inside a fenced code block or single-backtick inline-code span as MDX JSX expressions and escape them as `\{` / `\}`. Likewise, TS-style angle-bracket generics (`Array<String>`, `Map<K, V>`) outside inline code MUST be wrapped in backticks or HTML-entity-encoded.

CI's `npm run build` MUST fail when any page contains an unescaped JSX-expression-shaped substring referencing an undefined identifier, OR an unbalanced JSX-element-shaped substring without a matching close tag.

#### Scenario: Plain-text placeholder triggers no build error

- GIVEN a markdown table cell contains a literal placeholder like `{name}` outside a code fence
- WHEN the author commits and CI runs `npm run build`
- THEN if the brace is unescaped, the build MUST fail with a `ReferenceError`; if escaped (`\{name\}`) or wrapped in inline code (`` `{name}` ``), the build MUST succeed and the rendered page MUST display the literal characters

#### Scenario: TS-style generic in a table cell triggers no build error

- GIVEN a markdown table cell contains `Array<String>` outside a code fence
- WHEN CI runs `npm run build`
- THEN if the brackets are unwrapped, the build MUST fail with `Expected a closing tag for <String>`; if wrapped in inline code (`` `Array<String>` ``) or HTML-entity-encoded (`Array&lt;String&gt;`), the build MUST succeed

## MODIFIED Requirements

The following requirements were modified by the **unify-component-docs** change (archived 2026-05-09):

- **Docusaurus Configuration** — `url` switched from `https://conductionnl.github.io` to the custom-domain `https://nextcloud-vue.conduction.nl`; `baseUrl` from `/nextcloud-vue/` to `/`; `editUrl` switched from string-form to function-form to avoid `..` segments; explicit IA in `sidebars.js`; `themeConfig.playground.styleguideUrl` added; navbar Styleguide link dropped (deep-link only).
- **Custom Homepage** — Get Started link is now root-relative (`/docs/getting-started`) so it resolves under both `baseUrl: '/'` production and local dev.
- **GitHub Pages Deployment** — Single-workflow architecture replaced by three workflows (main / beta / development) with `keep_files: true` so root deploys preserve `/beta/styleguide/` and vice versa.
- **Auto-Generated Sidebar** → **Sidebar Information Architecture** — Flat directory autogen replaced by intent-grouped explicit IA.

## REMOVED Requirements

_(none)_

---

## Current Implementation Status

**Fully implemented.** The entire docs site infrastructure is in place and functional.

**Docusaurus Project Structure (implemented):**
- `nextcloud-vue/docusaurus/` -- Contains `docusaurus.config.js`, `package.json`, `package-lock.json`, `sidebars.js`, `src/`, `static/`
- `nextcloud-vue/docs/` -- Markdown content organized into subdirectories: `architecture/`, `components/`, `getting-started.md`, `integrations/`, `layouts/`, `store/`, `utilities/`
- Docusaurus is isolated from the library -- has its own `package.json` and does not add dependencies to root

**Docusaurus Configuration (implemented):**
- `docusaurus.config.js` configures title, tagline, url, baseUrl, organizationName, projectName, docs preset, Mermaid support, navbar, footer, and Prism syntax highlighting

**Custom Homepage (implemented):**
- `docusaurus/src/pages/index.js` -- React component with hero banner, title, tagline, "Get Started" button
- `docusaurus/src/components/HomepageFeatures/` -- Feature grid component

**Custom Theme CSS (implemented):**
- `docusaurus/src/css/custom.css` -- Custom CSS (exact color scheme needs verification against `#2fb298`)

**GitHub Pages Deployment (implemented):**
- `.github/workflows/documentation.yml` -- Triggers on push to main, builds, verifies, deploys

**Auto-Generated Sidebar (implemented):**
- `sidebars.js` uses `{ type: 'autogenerated', dirName: '.' }`

**Static Assets (implemented):**
- `docusaurus/static/img/logo.svg`, `docusaurus/static/img/screenshots/`

**Not yet implemented:**
- Search functionality (no local search plugin or Algolia DocSearch configured)
- Documentation versioning (only current version exists, no version dropdown)
- Mobile responsiveness is inherited from Docusaurus defaults but not explicitly tested/verified
- Code example copy button is a Docusaurus default feature (verify not disabled)

## Standards & References

- **Docusaurus 3.x** -- React-based static site generator
- **GitHub Pages** -- Deployed via `peaceiris/actions-gh-pages@v3` to `gh-pages` branch
- **Mermaid** -- Diagram support via `@docusaurus/theme-mermaid`
- **Prism** -- Code syntax highlighting with GitHub (light) and Dracula (dark) themes
- **WCAG AA** -- Color contrast requirements for custom theme colors
- **Open Webconcept** -- Brand color `#2fb298` used as primary color

## Specificity Assessment

- **Specific enough?** Yes, all infrastructure requirements are concrete with build commands, config values, and deployment steps.
- **Missing/ambiguous:**
  - Exact Docusaurus version (3.7.0 or latest 3.x) is not pinned
  - Search solution choice (local plugin vs Algolia) is left to implementer
  - Versioning is specified as a future strategy, not an immediate requirement
- **Open questions:**
  - Should the docs site include a component playground (e.g., Storybook embed or Docusaurus live code blocks)?
  - Should CI run a link checker on the built site to catch broken internal links?
