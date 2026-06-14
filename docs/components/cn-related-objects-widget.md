# CnRelatedObjectsWidget

Everything linked to an object, in one widget. Aggregates what an object relates to — through OpenRegister relations and leaf integrations — into grouped, clickable sections:

- **Objects** — outgoing (`uses`), incoming (`used`) and contractual (`contracts`) relations, resolved from the object store.
- **Files** — files attached to the object.
- **Linked apps** — entry points into the leaf integrations that carry related content (mails, calendar events, …) for this object.

It is a **Widget** (not a Card): it renders on the shared [`CnWidgetWrapper`](./cn-widget-wrapper.md) chrome, so it carries the standard overflow Actions menu (Refresh / Documentation / Request a feature). Refresh refetches every section.

The detail-page auto-body renders this widget beneath [`CnObjectDataWidget`](./cn-object-data-widget.md) automatically (manifest `type: "detail"` pages), and it is registered as the `related` built-in widget key for manifest grids.

## Usage

```vue
<CnRelatedObjectsWidget
  object-type="lead"
  :object-id="lead.id"
  :object-data="lead"
  :store="objectStore"
  @select-object="openObject"
  @select-file="openFile"
  @open-integration="openSidebarTab" />
```

Relation and file sections only render when the store exposes the matching actions (`relationsPlugin` / `filesPlugin`). Collections the store can't resolve generically (e.g. mails surfaced by a specific leaf) can be passed in via `extra-sections`.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `String` | `'Related'` | Widget title shown in the header |
| `object-type` | `String` | `''` | Registered object type slug (used for store fetches) |
| `object-id` | `String\|Number` | `''` | The object's id |
| `object-data` | `Object` | `{}` | The object data — used to derive id/type when not passed explicitly |
| `store` | `Object` | `null` | Object store instance. When omitted, the widget tries Pinia auto-detection. |
| `show-objects` | `Boolean` | `true` | Show the related-objects (uses/used/contracts) section |
| `show-files` | `Boolean` | `true` | Show the files section |
| `show-integrations` | `Boolean` | `true` | Show the leaf-integration entry-point section |
| `exclude-integrations` | `Array` | `[]` | Integration ids to omit from "Linked apps" (on top of the always-omitted core tabs) |
| `extra-sections` | `Array` | `[]` | Extra related sections the store can't resolve generically. Each: `{ key, label, icon?, items: [] }` |
| `documentation-url` | `String` | `''` | Documentation link for the overflow Actions menu |
| `widget-id` | `String` | `''` | Stable id forwarded to the widget chrome (falls back to `object-type`) |
| `objects-label` | `String` | `'Objects'` | Section heading for related objects |
| `files-label` | `String` | `'Files'` | Section heading for files |
| `linked-apps-label` | `String` | `'Linked apps'` | Section heading for leaf-integration entry points |
| `empty-label` | `String` | `'Nothing related yet'` | Empty-state label shown when nothing is related |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `@select-object` | related object record | A related-object row was clicked |
| `@select-file` | file record | A file row was clicked |
| `@select-extra` | `{ section, item }` | A row in a host-supplied `extra-sections` group was clicked |
| `@open-integration` | integration id (string) | A "Linked apps" row was clicked — the host opens that leaf (the detail-page auto-body deep-links the sidebar tab) |
