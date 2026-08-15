# CnObjectDataWidget

Schema-driven editable data grid widget. Displays object properties in a CSS grid, supports inline editing (click-to-edit with all widget types), dirty tracking, and saves via objectStore.

## Usage

```vue
<CnObjectDataWidget
  title="Character info"
  :schema="schema"
  :object-data="character"
  object-type="characters" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `String` | `'Data'` | Widget title in the card header |
| `icon` | `Object\|Function` | `null` | Optional MDI icon component for the header |
| `object-data` | `Object` | `null` | The object to display and edit. Keys must match the schema property keys. Optional — `null` while the object is still loading (internal reads are null-guarded). |
| `schema` | `Object` | `null` | JSON Schema defining properties. Must have a `properties` field. Optional — `null` renders the empty state (e.g. before the schema is fetched). |
| `object-type` | `String` | `''` | Registered object type slug in the objectStore. Required for saving via `objectStore.saveObject()`. |
| `store` | `Object` | `null` | Optional objectStore instance. When provided, used directly for saving instead of auto-detecting via Pinia. |
| `overrides` | `Object` | `{}` | Per-property configuration overrides (see below) |
| `columns` | `Number` | `3` | Number of grid columns |
| `editable` | `Boolean` | `true` | Whether editing is enabled globally — gates both inline (click-to-edit) and the full-form **Edit** action item |
| `edit-label` | `String` | `'Edit'` | Label for the Edit action item, which opens a schema-driven `CnFormDialog` pre-filled with the object (alongside inline editing) |
| `hide-empty` | `Boolean` | `false` | Hide fields that have no value instead of rendering them with an em dash. Read grid only — a field being edited, a field with an unsaved change, and the full Edit form stay visible. |
| `exclude` | `Array` | `[]` | Property keys to hide from display |
| `include` | `Array` | `null` | Property keys to show (whitelist — all others hidden) |
| `save-label` | `String` | `'Save'` | Label for the save button |
| `discard-label` | `String` | `'Discard'` | Label for the discard button |
| `empty-label` | `String` | `'No data available'` | Label when no properties are found |
| `documentation-url` | `String` | `''` | Documentation link surfaced in the widget's overflow Actions menu (empty hides the Documentation item). |
| `widget-id` | `String` | `''` | Stable id forwarded to the widget chrome (falls back to `object-type`). |
| `metadata-label` | `String` | `'Metadata'` | Label for the Metadata item in the overflow Actions menu. |

## Slots

| Slot | Scoped props | Description |
|------|-------------|-------------|
| `#actions` | — | Extra buttons in the widget header (right side, next to save/discard) |
| `#field-{key}` | `{ field, value, update, cancel }` | Override the inline editor for a specific property |
| `#display-{key}` | `{ field, value, raw }` | Override the display (read-only) view for a specific property |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `@saved` | result object | Emitted after a successful objectStore save |
| `@save-error` | error message | Emitted when the objectStore save fails |
| `@save` | merged data object | Emitted when no `objectType` is set — lets the parent handle the save |
| `@discard` | — | Emitted when the user clicks the discard button |

## One config, two surfaces (display + edit modal)

The `overrides` / `exclude` / `include` props drive a **single** [`fieldsFromSchema`](../../src/utils/schema.js) pipeline that both the inline display **and** the full-form **Edit** modal ([`CnFormDialog`](./cn-form-dialog.md)) consume. So a property hidden via `overrides.id.hidden = true` is hidden in the widget grid *and* dropped from the edit form; an `order` set on a property reorders both. `gridColumn`/`gridRow` (span) are display-only; the modal is single-column (stacked).

`fieldsFromSchema` honors, per property: `hidden` (drop the field), `order` (wins over the schema's own `order` for sorting), `readOnly: false` (un-skip a schema-readonly field), plus any field props to merge (`label`, `widget`, `enum`, …).

## Discriminated supertypes (`hide-empty`)

`exclude` / `include` / `overrides.hidden` are **static** — they hide the same keys for every object. That is the wrong tool for a schema whose properties are only relevant to *some* of its objects.

The canonical case is a supertype with a discriminator: one `ticket` schema holding `request | complaint | contactmoment`, where a complaint never carries the telephony fields (`ctiExtension`, `recordingUrl`, `dispositionNotes`, …) a contactmoment does. Rendering the union statically means every complaint shows a wall of em dashes.

Set `hide-empty` and the grid shows only what the object actually has, so the page becomes type-aware **without** the schema (or the manifest) having to enumerate which fields belong to which variant:

```vue
<CnObjectDataWidget
  :object-data="ticket"
  :schema="ticketSchema"
  hide-empty />
```

It is display-only and non-destructive: the field currently being edited, any field with an unsaved change, and the full **Edit** form all stay visible — so an empty field is always still reachable to fill in. `false` and `0` count as values, not absences, and are never hidden.

### Configuring it in-app

On a detail page in OpenBuild edit mode, the widget's cog opens [`CnObjectDataWidgetForm`](../../src/components/CnObjectDataWidgetForm/CnObjectDataWidgetForm.vue): it lists the schema's properties (resolved from the widget's `register`/`schema`, or the page's injected `cnObjectContext` when the widget inherits them) and lets you, per property, toggle **visibility**, set a **label**, **span**, **editor** type and **editable**, **drag to reorder**, and pick a **layout preset** (Stacked / 2-col / 3-col → the `columns` value). The form emits a minimal `overrides` map persisted on the widget's `content.overrides`.

## Property overrides

The `overrides` prop accepts per-property configuration:

```js
{
  propertyKey: {
    order: 1,          // Sort order (lower = first)
    gridColumn: 2,     // Number of grid columns to span
    gridRow: 2,        // Number of grid rows to span
    hidden: false,     // Whether to hide this property
    editable: true,    // Whether this property can be edited
    label: 'Custom',   // Override the display label
    widget: 'textarea', // Override the widget type for editing
    enum: [...],       // Override enum values for select/multiselect
  }
}
```

## Supported widget types

The widget auto-detects the editor based on the JSON Schema property type:

| Widget | Schema type | Editor |
|--------|-------------|--------|
| `text` | `string` | Text input |
| `email` | `string` format `email` | Email input |
| `url` | `string` format `uri` | URL input |
| `number` | `number`/`integer` | Number input |
| `textarea` | `string` (long) | Textarea |
| `select` | `string` with `enum` | Single select dropdown |
| `multiselect` | `array` with `enum` | Multi-select dropdown |
| `tags` | `array` (no enum) | Tag input |
| `checkbox` | `boolean` | Toggle switch |
| `date` | `string` format `date` | Date picker |
| `datetime` | `string` format `date-time` | Datetime picker |

## Example with overrides

```vue
<CnObjectDataWidget
  title="Publication details"
  :schema="publicationSchema"
  :object-data="publication"
  object-type="publications"
  :overrides="{
    title: { order: 1, gridColumn: 2 },
    description: { order: 2, gridColumn: 2, widget: 'textarea' },
    status: { order: 3, editable: false },
    internalNotes: { hidden: true },
  }" />
```

## Conditional immutability (`x-openregister-readonly-when`)

A schema property can declare that it becomes **read-only when another field on
the same object holds a given value** — the widget evaluates the rule against the
live object data and renders the field locked (shown, not hidden). This is the
declarative way to express identity fields that must not be edited in a
particular state (e.g. a hybrid app's `slug`/`name`/`description`/
`productionVersion`, which mirror the installed app it customizes).

```jsonc
// In the OpenRegister schema property:
"slug": {
  "type": "string",
  "x-openregister-readonly-when": { "field": "appType", "equals": "hybrid" }
}
// or match a set of values:
"slug": { "type": "string", "x-openregister-readonly-when": { "field": "appType", "in": ["hybrid", "managed"] } }
```

An unconditional `"readOnly": true` on the property locks the field in every
state (still shown, never editable). Both are honoured by `isEditable`; a
per-field `overrides[key].editable` still takes priority. Read-only here is a UI
affordance — pair it with server-side enforcement (an OpenRegister write guard /
listener) for the authoritative boundary.

## Reference (relation) display

Relation properties display the referenced object's **name, never its raw
uuid** (ADR-062). Two property shapes are recognised:

- `x-openregister-relation: { target: "<register>/<schema>" }` (explicit,
  works on every surface), and
- the canonical OpenRegister shorthand `"$ref": "<schemaSlug>"` on a
  uuid-string property or its array `items` — the slug resolves against the
  **same register**, taken from the detail-page object context
  (`cnObjectContext` inject). On surfaces without that context the shorthand
  falls back to the shortened-id display.

Names resolve via one `GET /api/objects/{register}/{schema}/{id}` per distinct
id (cached per widget instance): `name` → `title` → `displayName` →
`firstName lastName` → `@self.name` → the id itself.

### Scoping picker options: `x-relation-filter`

A relation property may declare `x-relation-filter` to narrow its edit-picker
options to objects that fit the CURRENT object:

```json
"status": {
  "type": "string", "format": "uuid", "$ref": "statusType",
  "x-relation-filter": { "caseType": "@object.caseType" }
}
```

Filter values are token-resolved (`@objectId` / `@object.<field>`), with the
widget's **dirty values winning** — picking a new caseType immediately scopes
the status options to it, before any save. Entries whose token stays
unresolved are dropped (an unfiltered picker beats an empty one). Options
reload on every edit start for the same reason.
