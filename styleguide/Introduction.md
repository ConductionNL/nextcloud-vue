[![npm last version](https://img.shields.io/npm/v/@conduction/nextcloud-vue.svg?style=flat-square)](https://www.npmjs.com/package/@conduction/nextcloud-vue)
[![build status](https://img.shields.io/github/actions/workflow/status/ConductionNL/nextcloud-vue/code-quality.yml?branch=main&style=flat-square)](https://github.com/ConductionNL/nextcloud-vue/actions/workflows/code-quality.yml?query=branch%3Amain)
[![Dependabot status](https://img.shields.io/badge/Dependabot-enabled-brightgreen.svg?longCache=true&style=flat-square&logo=dependabot)](https://dependabot.com)
[![test status](https://img.shields.io/github/actions/workflow/status/ConductionNL/nextcloud-vue/code-quality.yml?branch=main&style=flat-square&label=Test%20status)](https://github.com/ConductionNL/nextcloud-vue/actions/workflows/code-quality.yml?query=branch%3Amain)
[![License: EUPL-1.2](https://img.shields.io/badge/License-EUPL--1.2-blue.svg?style=flat-square)](https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12)

> 🏗️ Higher-level Vue 2 component library for building Conduction Nextcloud apps

- ✨ 50+ production-ready UI components
- 🛠️ Composables, store factories, and frontend utilities
- 📋 Schema-driven forms, tables, and filters from [JSON Schema](https://json-schema.org)
- 🗺️ [Manifest-driven app shell](https://github.com/ConductionNL/nextcloud-vue/blob/main/docs/manifest-renderer.md) — declare routes, navigation, and dependencies in one JSON file
- 🎨 Automatic theming via [NL Design System](https://nldesignsystem.nl) and Nextcloud CSS variables

## 📄 Documentation

| Branch | Channel | Styleguide |
|--------|---------|------------|
| main | stable releases | https://conductionnl.github.io/nextcloud-vue/styleguide/ |
| beta | pre-releases | https://conductionnl.github.io/nextcloud-vue/beta/styleguide/ |
| development | in-progress | https://conductionnl.github.io/nextcloud-vue/dev/styleguide/ |

## 📦 Install

```bash
npm install @conduction/nextcloud-vue
```

## 🚀 Usage

Register icons and translations once in `main.js`, before mounting:

```javascript
import { registerIcons, registerTranslations } from '@conduction/nextcloud-vue'

registerIcons({})       // pass app-specific icon overrides here
registerTranslations()  // without this, library strings stay in English
```

Then import components and styles where you need them:

```javascript
import { CnIndexPage, CnDataTable, CnPagination } from '@conduction/nextcloud-vue'
import '@conduction/nextcloud-vue/src/css/index.css'
```

## 📖 Design principles

**Nextcloud-native** — components use Nextcloud CSS variables (`var(--color-primary-element)`, `var(--color-border)`, etc.) and integrate with the Nextcloud shell without any custom theming.

**Slot-first** — every component exposes named slots. Dialogs support three override levels: full replacement, form-content override, and per-field override.

**Backwards compatible** — props, events, and slots are deprecated with a `console.warn` before removal. Minor bumps never break existing consumers.

**Schema-driven** — `columnsFromSchema`, `filtersFromSchema`, and `fieldsFromSchema` generate UI directly from a JSON Schema so you only describe your data model once.

## 📦 Consumer apps

Used by **OpenRegister**, **OpenCatalogi**, **Procest**, **Pipelinq**, and **MyDash**. Changes affect all of them — test carefully before releasing.
