---
status: draft
---

# docs-site-infrastructure delta — unify-component-docs

## Purpose

Reflect that the docs site is served from the custom domain `nextcloud-vue.conduction.nl` (via `gh-pages` CNAME), not the GitHub Pages default URL. Add the auto-generated reference pipeline (`vue-docgen-cli` prebuild) and the Vue Styleguidist iframe target at `/styleguide/`. Capture the three-workflow deploy architecture (`main`, `beta`, `development`) that already exists on `beta`.

## MODIFIED Requirements

### Requirement: Docusaurus Configuration

The `docusaurus.config.js` MUST configure:
- `title`: `@conduction/nextcloud-vue`
- `tagline`: A short description of the library's purpose (shared Vue components for Nextcloud apps built on OpenRegister)
- `url`: `https://nextcloud-vue.conduction.nl` (the production custom domain set in `gh-pages` `CNAME`)
- `baseUrl`: `/` (root — the custom domain serves Docusaurus at the apex, not under a project subpath)
- `organizationName`: `ConductionNL`
- `projectName`: `nextcloud-vue`
- `editUrl`: A function form `({ docPath }) => \`https://github.com/ConductionNL/nextcloud-vue/edit/beta/docs/${docPath}\`` (string-form editUrl produces broken `tree/<branch>/docusaurus/../docs/...` links because the docs `path` is `'../docs'`; a function form sidesteps the relpath doubling)
- Docs preset with `path: '../docs'` and auto-generated sidebars
- Mermaid theme support via `@docusaurus/theme-mermaid`
- Client-side redirects via `@docusaurus/plugin-client-redirects` (used by Phase 5 of the unification)
- Navbar with Documentation link and GitHub repository link
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
(unchanged — still mandates Documentation + GitHub links)

#### Scenario: Footer links
(unchanged)

#### Scenario: Mermaid diagrams render
(unchanged)

#### Scenario: Code blocks have syntax highlighting
(unchanged)

#### Scenario: Code blocks in dark mode
(unchanged)

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

### Requirement: GitHub Pages Deployment

The repository MUST ship three GitHub Actions workflows that publish to `gh-pages`:

- `.github/workflows/documentation.yml` — triggers on push to `main`. Builds Docusaurus AND Vue Styleguidist, copies the styleguide build into `docusaurus/build/styleguide/`, deploys to `gh-pages` root using `peaceiris/actions-gh-pages@v3` with `keep_files: true`. Verifies `index.html` exists. Creates `.nojekyll`.
- `.github/workflows/documentation-beta.yml` — triggers on push to `beta`. Builds Vue Styleguidist only, deploys to `gh-pages:/beta/styleguide/` with `keep_files: true` (so the Docusaurus root is preserved).
- `.github/workflows/documentation-dev.yml` — triggers on push to `development`. Same shape as beta, deploys to `gh-pages:/dev/styleguide/`.

All workflows MUST use Node.js 20 minimum and `npm ci --legacy-peer-deps` for install (the lib uses Vue 2.7 alongside Vue 3 peer deps from `@nextcloud/files@4.x`).

#### Scenario: Deploy from main republishes both Docusaurus and the styleguide

- GIVEN a merge into `main`
- WHEN `documentation.yml` runs
- THEN `gh-pages` MUST contain both the Docusaurus build at root AND `gh-pages:/styleguide/` (built from `styleguide/`), with `CNAME` preserved by `keep_files: true`

#### Scenario: Pre-existing /beta/styleguide/ survives a Docusaurus root deploy

- GIVEN `gh-pages` already contains `/beta/styleguide/` from a prior beta deploy
- WHEN a `main` push triggers `documentation.yml`
- THEN `/beta/styleguide/` MUST still be present after the deploy completes

#### Scenario: Pull request does not deploy
(unchanged — still requires PR-only runs to skip the deploy step)

## ADDED Requirements

### Requirement: Auto-generated component reference

The Docusaurus build MUST produce per-component reference partials at `docs/components/_generated/<ComponentName>.md` from the SFC source via `vue-docgen-cli`. The pipeline MUST:

- Run as a `prebuild` npm script in `docusaurus/package.json` so `npm run build` triggers it automatically.
- Read all `src/components/Cn*/Cn*.vue` files relative to the docusaurus dir.
- Emit Docusaurus-safe markdown: any `{` / `}` characters in prop defaults, descriptions, or examples MUST be backslash-escaped (`\{` / `\}`) to avoid MDX-3 JSX-expression parsing errors.
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

- GIVEN a component with a prop default value of `'{name}'` or a JSDoc example containing `{appId}`
- WHEN the partial is generated
- THEN curly braces in non-code-fence positions MUST be backslash-escaped so that MDX-3 does not parse them as JSX expressions

### Requirement: Live-demo Playground component

The site MUST ship `docusaurus/src/components/Playground.tsx` — an MDX-importable React component that embeds the Vue Styleguidist build via iframe. It MUST:

- Accept props `component: string` (component name, used to build the deep-link path), `path?: string` (override path, default `#!/{component}`), `height?: string` (default `'480px'`).
- Render an iframe with `src={\`/styleguide${path}\`}`.
- Render an "Open standalone" link below the iframe to the same URL.
- Auto-resize iframe height in response to a `postMessage` event from the Styleguidist build (best-effort; if the styleguide doesn't post the message, the default `height` MUST still produce a usable embed).

#### Scenario: Component page embeds working playground

- GIVEN a published page at `/docs/components/cn-data-table` containing `<Playground component="CnDataTable" />`
- WHEN a developer visits the page
- THEN an iframe MUST load `/styleguide/#!/CnDataTable` and a working `CnDataTable` demo MUST be interactive within it

#### Scenario: Open standalone link works

- GIVEN a Playground iframe is rendered on a docs page
- WHEN the developer clicks "Open standalone"
- THEN a new tab MUST open at `/styleguide/#!/<component>` showing the same component view full-width

### Requirement: Vue Styleguidist build is preserved at /styleguide/, /beta/styleguide/, /dev/styleguide/

The `gh-pages` deploy MUST keep the Vue Styleguidist build available as a standalone URL at `/styleguide/` (production), `/beta/styleguide/` (beta channel), and `/dev/styleguide/` (development channel). The standalone URLs are the iframe targets used by the `<Playground>` MDX component AND remain accessible to power users who prefer the playground-only view.

The Styleguidist build MUST NOT be linked from the navbar after the unification (Phase 5) — it is reachable by deep-linking only.

#### Scenario: Styleguide URLs return 200

- GIVEN the deployed `gh-pages` site is live at `nextcloud-vue.conduction.nl`
- WHEN any of `/styleguide/`, `/beta/styleguide/`, `/dev/styleguide/` is requested
- THEN the response MUST be a 200 with the Styleguidist app shell

### Requirement: MDX 3 brace safety

All hand-written markdown content under `docs/` MUST treat literal `{` and `}` characters that are not inside a fenced code block as MDX JSX expressions and escape them as `\{` / `\}`. CI's `npm run build` MUST fail when any page contains an unescaped JSX-expression-shaped substring referencing an undefined identifier.

#### Scenario: Plain-text placeholder triggers no build error

- GIVEN a markdown table cell contains a literal placeholder like `{name}` outside a code fence
- WHEN the author commits and CI runs `npm run build`
- THEN if the brace is unescaped, the build MUST fail with a `ReferenceError`; if escaped (`\{name\}`) or wrapped in inline code (`` `{name}` ``), the build MUST succeed and the rendered page MUST display the literal characters
