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
- `url`: The GitHub Pages URL (`https://conductionnl.github.io`)
- `baseUrl`: `/nextcloud-vue/`
- `organizationName`: `ConductionNL`
- `projectName`: `nextcloud-vue`
- Docs preset with `path: '../docs'` and auto-generated sidebars
- Mermaid theme support via `@docusaurus/theme-mermaid`
- Navbar with Documentation link and GitHub repository link
- Footer with Docs, Community, and Related Projects sections
- Prism syntax highlighting for code blocks with GitHub (light) and Dracula (dark) themes

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
- A "Get Started" button linking to `/docs/getting-started`
- A feature grid highlighting 3 key aspects of the library: Schema-Driven Components, OpenRegister Integration, and NL Design System Support

#### Scenario: Homepage loads

- GIVEN a user navigates to the site root (`/nextcloud-vue/`)
- WHEN the page renders
- THEN they SHALL see the hero banner with library name, tagline, a "Get Started" button, and 3 feature cards below

#### Scenario: Get Started button navigates correctly

- GIVEN a user is on the homepage
- WHEN they click the "Get Started" button
- THEN they MUST be navigated to the Getting Started guide at `/nextcloud-vue/docs/getting-started`

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

A GitHub Actions workflow (`.github/workflows/documentation.yml`) MUST:
- Trigger on push to the `main` branch
- Build the Docusaurus site using Node.js 20
- Deploy the `docusaurus/build/` output to the `gh-pages` branch using `peaceiris/actions-gh-pages@v3`
- Include build verification (check `index.html` exists)
- Create `.nojekyll` file for proper GitHub Pages rendering

#### Scenario: Automatic deployment on push

- GIVEN a developer pushes documentation changes to the `main` branch
- WHEN the GitHub Actions workflow runs
- THEN the site MUST be built and deployed to the `gh-pages` branch

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

### Requirement: Auto-Generated Sidebar

The sidebar MUST use Docusaurus auto-generation (`type: 'autogenerated', dirName: '.'`) so that adding new markdown files to `docs/` automatically creates sidebar entries. Authors MAY use `sidebar_position` frontmatter to control ordering. Category directories MAY use `_category_.json` files for section metadata.

#### Scenario: New doc page appears in sidebar

- GIVEN a developer adds a new markdown file to `docs/components/`
- WHEN the site rebuilds
- THEN the new page MUST appear in the Components sidebar section without any config changes

#### Scenario: Sidebar ordering respects frontmatter

- GIVEN two pages have `sidebar_position: 1` and `sidebar_position: 2` respectively
- WHEN the sidebar renders
- THEN the page with position 1 SHALL appear before the page with position 2

#### Scenario: Category sections use proper labels

- GIVEN a `docs/components/_category_.json` file exists with `{ "label": "Components" }`
- WHEN the sidebar renders
- THEN the Components section MUST use the label from the category JSON, not the directory name

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

## MODIFIED Requirements

_(none -- all new)_

## REMOVED Requirements

_(none -- all new)_

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
