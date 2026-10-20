---
sidebar_position: 7
---

import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnObjectCard.md'

# CnObjectCard

Schema-driven card for displaying an object's key information. Uses schema configuration to determine which fields to show as title, description, image, and metadata.

**Wraps**: NcCheckboxRadioSwitch, CnCellRenderer

## Try it

<Playground component="CnObjectCard" />

![CnObjectCard showing client data in card layout](/img/screenshots/cn-object-card.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `object` | Object | *(required)* | Object data |
| `schema` | Object | *(required)* | Schema with properties and configuration |
| `selected` | Boolean | `false` | Selection state |
| `pillLooks` | Object | `{}` | The referenced records' colour and icon names, by field and id (`{ [field]: { [id]: { color, icon } } }`, read by CnIndexPage). A record layout pill with `resolve: { colorField?, iconField? }` takes its record's tone and icon from here. |
| `selectable` | Boolean | `false` | Show selection checkbox |
| `cardFieldColumns` | Object | `null` | The page's columns by key: a fact or a layout part whose field names a column reads through that column's label, formatter and widget, as the table does |
| `clickToView` | Boolean | `false` | Body click on a selectable card emits `click` (navigation) instead of toggling selection — the checkbox stays the only selection surface (the card counterpart of a table's `rowClickToView`) |
| `maxMetadata` | Number | `4` | Max metadata fields shown |
| `accent` | Object | `null` | Status accent `{ variant, icon?, label? }`: a 4px start border in the `variant` color (`success`, `warning`, `error`, `info`, `primary`) and, with `icon` (a CnIcon name), a colored icon before the title. `label` is the icon's tooltip and accessible name. An unknown variant draws nothing. |

## Schema Configuration Keys

The schema's `configuration` object controls card layout:

| Key | Description |
|-----|-------------|
| `objectNameField` | Field used as card title |
| `objectDescriptionField` | Field used as description text |
| `objectImageField` | Field containing the image, resolved through [`resolveImageUrl`](../utilities/resolve-image-url.md) (an `app:<app>/<file>` reference or an `/apps/…` route becomes a real URL; an absolute URL is used as-is) |
| `objectSummaryField` | Field used as summary |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `aux-click` | `(object, event)` | Card middle-clicked (`auxclick`), under the same conditions as a navigating `click`. The second argument is the native event, for opening the card in a new tab. |
| `click` | `(object, event)` | Card clicked. The second argument is the native event, for opening the card in a new tab on a ctrl/cmd/shift click; a middle click emits `aux-click` instead. When `selectable` is `false` this is the primary navigation event. When `selectable` is `true` a deliberate click emits `select` (a text-selection drag is not treated as a click); for backwards compatibility `click` is **also** emitted (with a `console.warn` deprecation notice) if a `@click` listener is present — migrate selectable consumers to `@select`. |
| `select` | `object` | Selection toggled — emitted by the checkbox, and (when `selectable`) by a deliberate click anywhere on the card body. |

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `#badges` | `\{ object \}` | Badge section |
| `#actions` | `\{ object \}` | Actions section |
| `#metadata` | `\{ object, fields \}` | Metadata section override |

## Usage

```vue
<CnObjectCard
  :object="contact"
  :schema="contactSchema"
  :selectable="true"
  @click="onCardClick"
  @select="onSelect" />
```

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnObjectCard.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnObjectCard/CnObjectCard.vue) and update automatically whenever the component changes.

<GeneratedRef />

## Board look

Under the board look the card is white with a 12px radius, no shadow and no hover lift. The head row holds an optional `leading` element (`{ initials }` in a 36px circle, or `{ icon }` on a tint), the title with the description as its sub line, and at the end the `status` pill (a label, or `{ label, variant }`) or, without a status, the row menu from the `actions` slot. `cardFields` (property keys, in order) fills a two-column facts list; without it the card shows its first `maxMetadata` properties. `footerAction` (`{ label, meta?, ariaLabel? }`) adds a footer with one action and emits `footer-action`. The `metadata` slot still replaces the facts list. The `accent` border and icon show in the board look too, also on hover and on a selected card.

### Record layout (`layout`, manifest `config.cardLayout`)

With a `layout` the board card draws a record: a head pill and the number, the title, a meta line, an optional description and chips, and a footer with a pill and a date. Every part names a field (a dot path) and is left out while that field is empty.

| Part | Shape | Draws |
|------|-------|-------|
| `headPill`, `footerPill` | `{ field, colorMap?, labels?, variant? }` | A pill. |
| `number`, `title` | field | The number at the end of the head; the title. |
| `meta` | list of fields or `{ field, formatter? }` | One line, joined with " · ". |
| `description` | field, or `{ field, maxLength? }` | A line under the meta line, cut at `maxLength` characters (140 by default) with an ellipsis. |
| `chips` | list of fields or `{ field, formatter?, formatterOptions?, colorMap?, labels?, variant? }` | A pill per entry, its text read through the formatter (a status uuid as its name). |
| `footerDate` | `{ field, label?, overdueVariant? }` | "Deadline 5 Oct", in the `overdueVariant` tone (`error`) once the date has passed. |
