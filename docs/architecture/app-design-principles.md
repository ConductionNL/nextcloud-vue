---
title: App design principles
sidebar_position: 1
---

import { AppMock } from '@conduction/docusaurus-preset/components'

# App design principles

Every Conduction app — OpenRegister, OpenCatalogi, Procest, Pipelinq, MyDash, the dozen others — looks and works the same way on first sight. Same five structural pieces, same place, same behaviour. That recognisability isn't an accident: it's what `@conduction/nextcloud-vue` enforces, and what makes a user who's learnt one app productive in any of the others within minutes.

This page explains the **chassis** — the abstract layout shared by every app — the **five atoms** that make up the chassis, and the **stacked views** the library composes on top so you don't have to lay each atom out by hand.

## The chassis: one shape, every app

Every Conduction product surface is built on the same three-region chassis: a **topbar** across the top, a **left navigation** down the side, and a **main column** filling the rest. The contents differ wildly — a register browser, a process inbox, a dashboard, a chat archive — but the bones are identical, so the user never has to relearn where things live.

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', margin: '2rem 0' }}>
  <AppMock app="openregister" caption />
  <AppMock app="procest" caption />
  <AppMock app="mydash" caption />
</div>

Three different apps. Same shape: topbar with the user menu, left nav with the app sections, main column with whatever the page is doing. That's the chassis. `@conduction/nextcloud-vue` is what gives you that shape with one component (`CnAppRoot`) plus a JSON [manifest](./manifest.md).

## Five atoms, one chassis

Inside the chassis sit five recurring building blocks. Every page in every app composes some subset of these — they are the atoms of the design system.

| Atom | Where it lives | What it does |
|---|---|---|
| **Topbar** | Top edge, full-width | App switcher, search affordance, user menu, breadcrumb. Provided by Nextcloud's `NcAppHeader`; the library doesn't own this atom — it inherits it. |
| **Left navigation** | Left rail, full-height | Primary section navigation, driven by `manifest.menu[]`. One level of nesting, permission-filtered, sortable via `order`. Rendered by `CnAppNav`. |
| **Main column** | Centre, fluid | The page body. Whatever the active route renders — usually a `Cn*Page` ([CnIndexPage](../components/cn-index-page.md), [CnDetailPage](../components/cn-detail-page.md), [CnDashboardPage](../components/cn-dashboard-page.md)). |
| **Page header** | Top of the main column | Title + description + icon + per-page action buttons. Rendered by `CnPageHeader`. Uniform across pages so the user always knows what page they're on. |
| **Sidebar** | Right edge, fixed-width | Per-object detail context: search/filter on index pages ([CnIndexSidebar](../components/cn-index-sidebar.md)), object metadata on detail pages ([CnObjectSidebar](../components/cn-object-sidebar.md)). Toggleable, never required. |

These five atoms cover almost every screen Conduction ships. New apps don't invent new atoms — they compose the existing ones in the right shape.

## Stacked views: the library's job

Wiring the five atoms together by hand on every page would be repetitive and inconsistent. `@conduction/nextcloud-vue` exposes them as **stacked views** — opinionated higher-level components that arrange the atoms for the most common page shapes:

- **[CnIndexPage](../components/cn-index-page.md)** — Topbar + Left nav + Page header + Main (table/cards + filter bar + pagination + CRUD dialogs) + Sidebar (search + facets). Schema-driven: feed it a JSON Schema and you get a sortable, filterable, editable list page in one prop.
- **[CnDetailPage](../components/cn-detail-page.md)** — Topbar + Left nav + Page header + Main (stats / charts / cards) + Sidebar (object metadata, files, notes, audit trail). For pages that show *one* thing in depth.
- **[CnDashboardPage](../components/cn-dashboard-page.md)** — Topbar + Left nav + Page header + Main (drag-and-drop widget grid). For high-level overviews with KPIs, charts, tile-shortcuts.
- **[CnSettingsPage](../components/cn-settings-page.md)** — Topbar + Left nav + Page header + Main (sectioned forms wired to `IAppConfig`). For admin / configuration screens.

Pick the stacked view that matches the page's purpose; the chassis comes free. Per-page customisation happens through slots and props, never through re-laying-out the atoms.

## Why this matters

Three things follow from the chassis-plus-atoms-plus-views discipline:

1. **Cross-app muscle memory.** A user who learnt where things are in OpenRegister navigates Procest the first time without reading docs.
2. **Consistent accessibility, theming, i18n.** All five atoms inherit Nextcloud's CSS variables, NL Design System tokens, and standard ARIA — no per-app drift.
3. **Composability stays cheap.** A new app describes its content in a [JSON manifest](./manifest.md) and a [schema](./schemas-and-registers.md); the chassis renders it.

## Where to next

- **[App manifest](./manifest.md)** — the JSON contract that fills and configures the atoms.
- **[Schemas and registers](./schemas-and-registers.md)** — how data structure flows from the backend register into the frontend stacked views.
- **[Component reference](/docs/components)** — every `Cn*` component used by the stacked views, with live demos.
