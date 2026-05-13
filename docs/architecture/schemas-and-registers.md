---
title: Schemas and registers
sidebar_position: 3
---

# Schemas and registers

Every Conduction app stores its data in **OpenRegister**, the schema-driven object store that ships as a Nextcloud app. The schema is the **single source of truth** for that app's data — and `@conduction/nextcloud-vue` reads the same schema to drive the frontend. One JSON Schema → typed records on the backend, sortable columns + faceted filters + form fields + validation messages on the frontend.

This is the contract that lets a new app go from "I have a domain object" to "I have a working list page with create/edit/delete and faceted search" in roughly one schema file plus a [manifest](./manifest.md) entry.

## Two consumers, one schema

A schema in OpenRegister is a JSON Schema document plus a few Conduction extensions (`title`, `icon`, per-property `widget`, `enum`, `searchable`, `facetable`, `adminOnly`). It serves two consumers simultaneously:

**Backend (OpenRegister) reads:**
- `properties.*.type` → column types in the underlying store.
- `required[]` → enforce-on-write validation.
- `properties.*.format` → typed validation (email, uri, date-time, uuid).
- `relations.*` → automatic cascade and ref-integrity rules.
- Audit + time-travel infrastructure → applied to every property uniformly.

**Frontend (`@conduction/nextcloud-vue`) reads:**
- `properties.*.title` → column label, form label.
- `properties.*.widget` → which input renders (text, select, multiselect, date, json, code, …).
- `properties.*.enum` (or async function) → dropdown options for select/multiselect/tags.
- `properties.*.facetable` → whether the property appears as a facet in [CnIndexSidebar](/docs/components/cn-index-sidebar).
- `properties.*.searchable` → whether the property gets searched by [CnFilterBar](/docs/components/cn-filter-bar).
- `properties.*.description` → input help text + form-validation error context.
- `properties.*.adminOnly` → hide from non-admin users in filters and forms.

Same file. Two readers. Zero duplication.

## How the frontend consumes a schema

The library's three "from-schema" utilities translate the JSON Schema into UI-ready shapes:

| Utility | Reads | Produces |
|---|---|---|
| [`columnsFromSchema`](/docs/utilities/columns-from-schema) | `properties` + per-prop `column` extensions | `[{ key, label, sortable, width, … }]` for [CnDataTable](/docs/components/cn-data-table) |
| [`filtersFromSchema`](/docs/utilities/filters-from-schema) | `properties[*].facetable` | facet definitions for [CnFacetSidebar](/docs/components/cn-facet-sidebar) and [CnIndexSidebar](/docs/components/cn-index-sidebar) |
| [`fieldsFromSchema`](/docs/utilities/fields-from-schema) | `properties` + per-prop `widget` / `enum` / `validation` | field definitions for [CnFormDialog](/docs/components/cn-form-dialog) and [CnAdvancedFormDialog](/docs/components/cn-advanced-form-dialog) |

Every [stacked view](./app-design-principles.md#stacked-views-the-librarys-job) that takes a `schema` prop runs them automatically. Pass `schema` to [CnIndexPage](/docs/components/cn-index-page) and you get auto-generated columns, filters, and form fields out of the same data model.

## Registers: deployment-time scoping

A **register** is a deployment-time scoping unit on top of a schema. The same `lead` schema can live in multiple registers — `crm-leads` for the sales team, `qualified-leads` for the marketing team — each with its own access control, retention policy, and audit trail. The schema defines the *shape*; the register defines *where this instance lives and who can see it*.

For the frontend this means almost every page picks two slots:

```jsonc
// in app manifest
{
  "type": "index",
  "config": {
    "register": "crm-leads",
    "schema": "lead"
  }
}
```

The library treats the pair as a stable address. [`useObjectStore`](/docs/store/object-store) takes both, fetches at `/index.php/apps/openregister/api/objects/{register}/{schema}`, and exposes a typed CRUD interface. CRUD calls, faceted search, audit trail fetches, file attachments — all scoped to that register+schema pair.

## Schemas tell the frontend which integrations are available

Beyond data structure, schemas also **declare which integrations the frontend should expose** for objects of this type:

- `audit: true` → [CnObjectSidebar](/docs/components/cn-object-sidebar) shows the Audit Trail tab.
- `files: true` → CnObjectSidebar shows the Files tab (NC Files file picker, attachment links).
- `notes: true` → CnObjectSidebar shows the Notes tab ([CnNotesCard](/docs/components/cn-notes-card)).
- `tasks: true` → CnObjectSidebar shows the Tasks tab ([CnTasksCard](/docs/components/cn-tasks-card)).
- `tags: true` → CnObjectSidebar shows the Tags tab.
- `chat: { register, schema }` → drilldowns from this object can open a [CnChatPage](/docs/components/cn-chat-page) scoped to that conversation register.

The schema is therefore the **wiring map** between an object and the rest of the Nextcloud workspace. A `lead` with `files: true` automatically gets attachment support; a `decision` with `chat: { register: 'talk', schema: 'conversation' }` automatically gets a Talk-backed discussion thread per record.

## Why schemas live in OpenRegister, not in the consumer app

Putting the schema in OpenRegister instead of in the consumer app's source code has three consequences worth highlighting:

1. **Admins edit the schema, not developers.** Adding a new `priority` field to the `lead` schema is a schema-edit in the OpenRegister UI — no app PR, no redeploy. The frontend picks up the new column on the next page render.
2. **Cross-app reuse.** The same `client` schema can be referenced by multiple apps. The Sales app and the Support app both render their lists from the one canonical client record.
3. **Migrations are a schema change.** Versioning a schema (`schema_v2`) is the migration. OpenRegister's time-travel keeps historical records readable through the old shape; new records use the new shape.

## App-availability guard (opt-out)

Every fleet app depends on **OpenRegister** as its data store — no schema, no register, no app. To keep that contract explicit and uniform across the fleet, `CnAppRoot` ships an always-on guard: on mount it consults the Nextcloud capabilities API and, when OpenRegister is missing, renders a default empty-state with a one-click action linking to the OpenRegister integration page.

The guard is configured via the `requiresApps` prop:

```vue
<!-- Default: guard is on; checks for `openregister` capability key -->
<CnAppRoot :manifest="manifest" app-id="myapp" :translate="t" />

<!-- Opt out: docs site, styleguide, or future utility apps -->
<CnAppRoot :manifest="manifest" app-id="docs" :translate="t" :requires-apps="[]" />
```

Why this lives in the library rather than in each consumer app:

- **One write path.** Every fleet app would otherwise hand-roll the same wrapper — different copy, different App Store URLs, different icons. Centralising the guard means one canonical place to evolve the contract.
- **The library already knows about OpenRegister.** Schemas, registers, the object-store composable, the file picker — they all assume OR is present. The guard is the natural counterpart.
- **New apps inherit the guard automatically.** The default reaches the entire fleet without the consumer remembering to import a wrapper.

Consumer apps that need a custom empty-state replace it via the `#or-missing` scoped slot. Apps that need additional Nextcloud apps (e.g. `openconnector` for push) extend the array: `:requires-apps="['openregister', 'openconnector']"`. See [Migrating to the JSON manifest → App-availability guard](../migrating-to-manifest.md#app-availability-guard) for the full prop and slot reference.

The guard is independent of `manifest.dependencies`. The two coexist: `requiresApps` checks the capabilities-API bootstrap once on mount; `manifest.dependencies` covers per-app declarations resolved through `useAppStatus` (which reads `OC.appswebroots` first and falls back to capabilities). On a Conduction host, OpenRegister always advertises a capability key — the guard's empty-state activates only when OR is genuinely missing or its capability is admin-restricted for the current user.

## Where to next

- **[App design principles](./app-design-principles.md)** — the chassis the schema-driven views render into.
- **[App manifest](./manifest.md)** — how each page declares its `register` + `schema` pair.
- **[Component reference](/docs/components)** — every `Cn*` component that consumes schemas, with live demos.
- **[OpenRegister integration guide](/docs/integrations/openregister)** — the deeper dive into the OpenRegister API surface and how the library's store layer talks to it.
- **[Object store reference](/docs/store/object-store)** — `useObjectStore` and the CRUD primitives that wrap a register+schema pair.
