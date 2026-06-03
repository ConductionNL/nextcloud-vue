---
title: Migrating to v2
sidebar_position: 10
---

# Migrating to v2

The `manifest-migrate` CLI codemod automates the mechanical parts of upgrading a v1 app manifest to the v2 format. It reads your existing `src/manifest.json`, applies all structural transformations, validates the output against the v2 schema, and produces a Markdown report listing items that require manual attention.

## Installation

The codemod ships as a bin entry in `@conduction/nextcloud-vue`. No separate install is required if the package is already in your project:

```bash
# Run directly via npx (always uses the version installed in your project)
npx @conduction/nextcloud-vue manifest-migrate --input src/manifest.json

# Or via node_modules
./node_modules/.bin/manifest-migrate --input src/manifest.json
```

## Quick start

```bash
# Transform in place and write a migration report
npx @conduction/nextcloud-vue manifest-migrate \
  --input src/manifest.json \
  --report MIGRATION_REPORT.md

# Preview the result without writing any files
npx @conduction/nextcloud-vue manifest-migrate \
  --input src/manifest.json \
  --dry-run

# Validate only (no transformation)
npx @conduction/nextcloud-vue manifest-migrate \
  --input src/manifest.json \
  --validate-only
```

## CLI flags reference

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--input <path>` | Yes | — | Path to the v1 manifest JSON to transform |
| `--output <path>` | No | Same as `--input` | Path to write the transformed v2 manifest |
| `--validate-only` | No | false | Validate input against its declared `$schema`; skip transformation |
| `--report <path>` | No | — | Write the migration report (Markdown) to this path |
| `--dry-run` | No | false | Print transformed JSON to stdout, report to stderr; write nothing |
| `--help` | No | — | Print usage and exit 0 |

### `--dry-run` is pipeable

```bash
npx @conduction/nextcloud-vue manifest-migrate \
  --input src/manifest.json --dry-run \
  | jq '.pages | length'
```

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success: transformation complete and output is valid v2; OR validate-only passed; OR input already v2 |
| `1` | Failure: missing file, invalid JSON, schema validation error, or unhandled error |

## Migration matrix

The following transformation rules are applied automatically in order:

| # | Rule | v1 shape | v2 result |
|---|------|----------|-----------|
| 1 | Verify carry-forward fields | `dataSource`, `@resolve:*`, `dynamicSource`, `sidebarComponent` | Preserved verbatim; listed in report |
| 2 | Migrate `customComponents` | `{ customComponents: { K: {...} } }` | `{ registry: { K: { ..., kind: "component" } } }` |
| 3 | Handle custom pages | `type: "custom"` | `_note` added; trivial ones get registry suggestion in report |
| 4 | Merge dashboard widgets+layout | `config.widgets[]` + `config.layout[]` | `pages[].widgets[]` with grid coords; `config.layout` removed |
| 5 | Lift sidebar tab widgets | `config.sidebarTabs[].widgets[]` | `pages[].widgets[]` with `slot: "sidebar"`, `tabGroup: "<tabId>"` |
| 6 | Flatten settings sections | `config.sections[].widgets[]` | `pages[].widgets[]` with `slot: "section:<sectionId>"` |
| 7 | Flatten settings tabs | `config.tabs[].sections[].widgets[]` | `pages[].widgets[]` with `slot: "tab:<tabId>"` |
| 8 | Migrate `cardComponent` | `config.cardComponent: "<Name>"` | `card-grid` widget prepended to `pages[].widgets[]` |
| 9 | Normalize action types | `actions[].type` omitted | `type: "handler"` added explicitly |
| 10 | Set `$schema` | Any v1 manifest | `$schema` set to v2 canonical URL |

## What requires manual attention

The codemod marks the following items with a `_note` field on the page and lists them in the migration report:

### Non-trivial `type: "custom"` pages

Any `type: "custom"` page whose `component` does not resolve to an entry in `customComponents` receives:

```json
"_note": "TODO: manual migration required — custom page not auto-converted"
```

Review each flagged page and decide whether it can be converted to a standard page type (`index`, `detail`, `dashboard`, etc.) or should remain custom with a documented reason.

### Sidebar tabs with `component` (no `widgets`)

A `sidebarTabs[]` entry that declares a `component` instead of a `widgets[]` array cannot be auto-lifted because there is no `widgetKey` to assign. The codemod retains these tabs in `config.sidebarTabs` and adds a TODO to the report.

### Settings sections with `fields[]` body

Sections that use `fields[]` or `component` instead of `widgets[]` are retained in `config.sections` (not flattened). The v2 renderer continues to handle `config.sections` for back-compatibility; these sections do not need immediate migration.

## Interpreting the migration report

When you pass `--report MIGRATION_REPORT.md`, the report is structured as follows:

1. **Summary** — counts of each transformation type applied
2. **Manual Migration Required** — table + checklist of pages needing manual follow-up
3. **Registry Suggestions** — JSON snippets showing how to add trivial custom components to the `registry` map
4. **customComponents → registry Migration** — full `registry` block ready to paste into `CnAppRoot`'s `registry` prop
5. **Carried-Forward Fields** — table of fields preserved verbatim (for audit)
6. **Per-Page Details** — per-page list of what the codemod did

## Common pitfalls

### `dataSource` carry-forward

`dataSource` fields on widgets, pages, and menu items are preserved exactly as-is. No transformation is applied to the `dataSource` shape. This is intentional — the v2 schema accepts the same `dataSource` shape as v1.

### `@resolve:` fields

Fields with `@resolve:` prefixes (e.g. `"@resolve:register": "some-register"`) are preserved verbatim. The codemod does not attempt to inline sentinel values; they are resolved at runtime by the manifest loader.

### `customComponents` → `registry` and `CnAppRoot` prop

After running the codemod, the manifest no longer has a `customComponents` key — it has `registry` instead. You must update the `CnAppRoot` usage in your app's `App.vue`:

```diff
- <CnAppRoot :custom-components="customComponents" ... />
+ <CnAppRoot :registry="registry" ... />
```

Where `registry` is the same object that was previously `customComponents`, now with `kind: "component"` added to each entry. The migration report includes the full `registry` block ready to use.

### `sidebarTabs` with component-only tabs

If a detail page's sidebar tabs use `component` instead of `widgets[]`, the codemod cannot auto-convert them. These tabs remain in `config.sidebarTabs`. The v2 renderer falls back to the v1 `sidebarTabs` rendering path for component-only tabs; they continue to work but are not migrated to the uniform `widgetEntry` shape.

### Dashboard `layout[]` entry matching

The codemod matches `config.widgets[]` entries to `config.layout[]` entries by `widgetId` (or `id` when `widgetId` is absent). If a widget has no matching layout entry, it receives default grid coordinates (`gridX: 0, gridY: auto, gridWidth: 2, gridHeight: 2`). Review the output if your dashboard had widgets without layout entries.

### Idempotency

Running the codemod twice is safe. On the second run, the manifest already declares the v2 `$schema`, so the codemod detects idempotency and exits 0 without changes.

```bash
# First run — transforms
manifest-migrate --input src/manifest.json

# Second run — no-op
manifest-migrate --input src/manifest.json
# Output: "Manifest is already v2 and valid. No changes needed."
```

## Examples

### Example: minimal v1 → v2

**Before:**

```json
{
  "$schema": "https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest.schema.json",
  "version": "1.0.0",
  "menu": [{ "id": "home", "label": "Home", "route": "home" }],
  "pages": [
    {
      "id": "home",
      "route": "/",
      "type": "dashboard",
      "title": "Home",
      "config": {
        "widgets": [{ "id": "w1", "type": "counter", "title": "Count" }],
        "layout": [{ "id": "l1", "widgetId": "w1", "gridX": 0, "gridY": 0, "gridWidth": 3, "gridHeight": 2 }]
      }
    }
  ]
}
```

**After (codemod output):**

```json
{
  "$schema": "https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json",
  "version": "1.0.0",
  "menu": [{ "id": "home", "label": "Home", "route": "home" }],
  "pages": [
    {
      "id": "home",
      "route": "/",
      "type": "dashboard",
      "title": "Home",
      "config": {},
      "widgets": [
        {
          "widgetKey": "counter",
          "slot": "body",
          "gridX": 0,
          "gridY": 0,
          "gridWidth": 3,
          "gridHeight": 2,
          "props": { "title": "Count" }
        }
      ]
    }
  ]
}
```

### Example: `--validate-only`

```bash
manifest-migrate --input src/manifest.json --validate-only
# Valid (v1 schema; use the codemod to migrate to v2)

manifest-migrate --input src/manifest.json    # transform first
manifest-migrate --input src/manifest.json --validate-only
# Valid (v2 schema)
```

### Example: `--output` to a different file

```bash
manifest-migrate \
  --input src/manifest.json \
  --output src/manifest-v2.json \
  --report MIGRATION_REPORT.md
```

This leaves `src/manifest.json` unchanged and writes the v2 result to `src/manifest-v2.json`.
