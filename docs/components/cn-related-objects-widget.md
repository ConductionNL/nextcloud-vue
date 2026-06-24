# CnRelatedObjectsWidget

Everything linked to an object, in one widget. It has two rendering modes that share the [`CnWidgetWrapper`](./cn-widget-wrapper.md) chrome.

## Tabbed self-fetch mode (default)

With `layout="tabs"` (the default), the widget resolves the object's `register` / `schema` / `id` — from the `register` / `schema` props, falling back to `object-data['@self']` — and fetches its relations **directly from OpenRegister**, with no object-store wiring required:

- **`/relations`** — the aggregated leaf groups: **Mails**, **Meetings**, **Contacts**, **Notes**, **Tasks**, **Deck**.
- **`/uses` + `/used`** — merged (and deduped) into a single **Objects** group; **`/contracts`** is folded in only when `show-contracts` is set.
- **`/files`** — the **Files** group.

It renders **one tab per non-empty group**, each with a count badge equal to the group's `total`, and shows that group's items inline. Clicking an item **deep-links to its owning Nextcloud app**: files open via the canonical `/f/{fileid}` permalink (Files + Viewer), records carrying a `url`/`link`/`accessUrl` open that, and known leaf types (contacts, deck) build their app route; related **objects** emit `@select-object` for the host to route to their detail page. When no link can be resolved, `@select-related` is emitted so the host can route it. When every group is empty, no tab renders and the empty state shows.

> Earlier builds offered an "open in sidebar" action per tab. That was removed — it only worked when the host mounted `CnObjectSidebar`, and silently did nothing otherwise. Deep-linking to the owning app works regardless of host wiring. (`open-in-sidebar-label` is kept as a deprecated no-op prop.)

## Legacy list mode (deprecated)

With `layout="list"` — or when no `register`/`schema` can be resolved — the widget falls back to the original flat sections driven by the object store's `fetchUses` / `fetchUsed` / `fetchContracts` / `fetchFiles` actions, plus the static leaf-integration **Linked apps** list. This path logs a one-time deprecation warning. Prefer the tabbed mode.

It is a **Widget** (not a Card): it carries the standard overflow Actions menu (Refresh / Documentation / Request a feature); Refresh refetches every group. The detail-page auto-body renders this widget beneath [`CnObjectDataWidget`](./cn-object-data-widget.md) automatically (manifest `type: "detail"` pages), and it is registered as the `related` built-in widget key for manifest grids.

## Usage

```vue
<!-- Tabbed self-fetch (default): just pass the loaded object -->
<CnRelatedObjectsWidget
  :object-data="lead"
  @select-object="openObject"
  @select-file="openFile"
  @select-related="openLeafItem"
  @open-integration="openSidebarTab" />

<!-- Or pass register/schema/id explicitly to override @self -->
<CnRelatedObjectsWidget
  register="crm"
  schema="lead"
  :object-id="lead.id"
  :show-contracts="true" />
```

In the deprecated list mode, relation and file sections only render when the store exposes the matching actions (`relationsPlugin` / `filesPlugin`). Collections the store can't resolve generically can be passed in via `extra-sections`.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `String` | `'Related'` | Widget title shown in the header |
| `object-type` | `String` | `''` | Registered object type slug (used for legacy store fetches) |
| `object-id` | `String\|Number` | `''` | The object's id |
| `object-data` | `Object` | `{}` | The object data — used to derive id/`register`/`schema` (from `@self`) when not passed explicitly |
| `register` | `String` | `''` | OpenRegister register slug. When omitted, derived from `object-data['@self'].register`. Required (with `schema`) for the tabbed self-fetch path |
| `schema` | `String` | `''` | OpenRegister schema slug. When omitted, derived from `object-data['@self'].schema`. Required (with `register`) for the tabbed self-fetch path |
| `layout` | `String` | `'tabs'` | Render mode: `'tabs'` (self-fetch, tab per non-empty group) or `'list'` (deprecated store-action list) |
| `show-contracts` | `Boolean` | `false` | Include `/contracts` relations in the Objects group (opt-in) |
| `store` | `Object` | `null` | Object store instance (legacy list path only). When omitted, the widget tries Pinia auto-detection. |
| `show-objects` | `Boolean` | `true` | Show the related-objects (uses/used/contracts) section |
| `show-files` | `Boolean` | `true` | Show the files section |
| `show-integrations` | `Boolean` | `true` | Show the leaf-integration entry-point section |
| `exclude-integrations` | `Array` | `[]` | Integration ids to omit from "Linked apps" (on top of the always-omitted core tabs) |
| `extra-sections` | `Array` | `[]` | Extra related sections the store can't resolve generically. Each: `{ key, label, icon?, items: [] }` |
| `documentation-url` | `String` | `''` | Documentation link for the overflow Actions menu |
| `widget-id` | `String` | `''` | Stable id forwarded to the widget chrome (falls back to `object-type`) |
| `objects-label` | `String` | `'Objects'` | Section heading for related objects |
| `files-label` | `String` | `'Files'` | Section heading for files |
| `linked-apps-label` | `String` | `'Linked apps'` | Section heading for leaf-integration entry points (legacy list path) |
| `open-in-sidebar-label` | `String` | `'Open in sidebar'` | **Deprecated, no-op.** The per-tab open-in-sidebar affordance was removed in favour of deep-linking; kept for backward compatibility |
| `empty-label` | `String` | `'Nothing related yet'` | Empty-state label shown when nothing is related |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `@select-object` | related object record | An Objects row was clicked |
| `@select-file` | file record | A Files row was clicked |
| `@select-related` | `{ group, item }` | A leaf-group row (mails, events, contacts, …) was clicked in tabbed mode and no owning-app deep link could be resolved |
| `@select-extra` | `{ section, item }` | A row in a host-supplied `extra-sections` group was clicked (legacy list path) |
| `@open-integration` | integration id (string) | A "Linked apps" row or a tab's "open in sidebar" affordance was activated — the host opens that leaf (the detail-page auto-body deep-links the sidebar tab) |
