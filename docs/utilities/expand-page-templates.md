# expandPageTemplates

Entity-scaffold page-template expander (manifest-entity-scaffold-templating,
2026-07-06 manifest fleet audit item 12).

Apps that declare many near-identical index/detail pages — differing only in
their register/schema binding, label, and a field/column subset — can express
the shape **once** as a `pageTemplates[]` entry plus a compact per-entity
`pageInstances[]` list, instead of copy-pasting N full page definitions.
`expandPageTemplates` materialises those instantiations into ordinary concrete
`pages[]`, so the runtime page renderer (`CnPageRenderer`) is unchanged by
templating — it only ever sees concrete pages.

Expansion runs at **build/boot time** (before/at load). It is already wired into
[`buildManifest`](./build-manifest.md), so a templated manifest expands
transparently at app boot; a manifest with no `pageTemplates`/`pageInstances` is
returned untouched.

```js
import { expandPageTemplates } from '@conduction/nextcloud-vue'

const { manifest, pages, expandedCount, errors } = expandPageTemplates(templatedManifest)
```

## Signature

```js
expandPageTemplates(manifest, options?) => {
  manifest,        // new manifest with instantiations materialised into pages[]
  pages,           // the resulting concrete pages[]
  expandedCount,   // number of instantiations expanded
  errors,          // string[] of named expansion errors (empty on success)
}
```

| Option | Default | Effect |
|--------|---------|--------|
| `throwOnError` | `false` | When `true`, throw an `Error` concatenating every named expansion error (build-time / codemod path). When `false` (runtime fallback), errors are collected on `errors` and the offending instantiation is skipped, so one bad instance never blanks the app. |
| `stripTemplates` | `false` | When `true`, also drop `pageTemplates` and `sets` from the output (build-time ship path, where nothing further will instantiate). |

The input manifest is never mutated. After a successful expansion the
`pageInstances` key is removed from the output (its pages now live in `pages[]`).

## Authoring model

A manifest gains three optional, additive top-level keys:

- **`pageTemplates[]`** — each `{ id, params[], page }`. `page` is an ordinary
  v2 page whose string leaves may contain `{{param}}` placeholders and
  `{{set:NAME}}` set references. `params[]` declares each placeholder's `name`
  and whether it is `required`.
- **`pageInstances[]`** — each `{ templateRef, register?, schema?, label?, params?, override? }`.
  `register`/`schema`/`label` are first-class shortcuts folded into the
  parameter map; `params` carries any additional declared parameters (a
  field/column subset is an array value).
- **`sets`** — named, reusable field/column/sidebar blocks referenced from a
  template via a `{{set:NAME}}` placeholder, so a repeated block is declared once.

### Substitution rules

- An **exact-match** placeholder (`"{{schema}}"`) is replaced with the parameter
  value preserving its JSON type (string, array, object, …).
- An **embedded** placeholder (`"Manage {{label}} records"`) is replaced by
  string interpolation.
- A `{{set:NAME}}` placeholder resolves to `manifest.sets.NAME`.
- An exact-match placeholder whose **optional** parameter is absent causes its
  containing key to be omitted from the expanded page.

### Layered-delta override

An instantiation may carry an `override` object applied over the substituted
page via the **same** base+delta merge as
[`mergeManifestDelta`](./merge-manifest-delta.md) — a template is the shared base
and an instantiation (or a per-user/app override on top of it) is a delta over
that base (the layered-versioned-app-deltas alignment). No second merge model is
introduced.

## Named errors

Expansion fails (throw, or collected on `errors`) with a message naming the
offending instantiation for:

- an unknown `templateRef` (no `pageTemplates[]` entry declares it),
- a missing **required** template parameter,
- a placeholder that is not a declared parameter of the template,
- an unknown `{{set:NAME}}` reference.

## Example

```json
{
  "pageTemplates": [{
    "id": "detailScaffold",
    "params": [
      { "name": "id", "required": true },
      { "name": "route", "required": true },
      { "name": "label", "required": true },
      { "name": "schema", "required": true },
      { "name": "fields", "required": true }
    ],
    "page": {
      "id": "{{id}}", "route": "{{route}}", "type": "detail", "title": "{{label}}",
      "config": { "register": "shillinq", "schema": "{{schema}}", "auditTrail": true, "fields": "{{fields}}", "sidebarProps": "{{set:auditSidebar}}" }
    }
  }],
  "sets": { "auditSidebar": { "tabs": [{ "id": "audit", "label": "Audit Trail", "order": 90 }] } },
  "pageInstances": [
    { "templateRef": "detailScaffold", "schema": "Invoice", "label": "Invoice", "params": { "id": "InvoiceDetail", "route": "/finance/invoices/:id", "fields": [{ "key": "total", "label": "Total", "type": "number" }] } }
  ]
}
```

Expands to one concrete `detail` page for `InvoiceDetail`, byte-equivalent
(modulo key order) to the hand-written page it replaces.
