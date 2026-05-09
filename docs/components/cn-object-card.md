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
| `selectable` | Boolean | `false` | Show selection checkbox |
| `maxMetadata` | Number | `4` | Max metadata fields shown |

## Schema Configuration Keys

The schema's `configuration` object controls card layout:

| Key | Description |
|-----|-------------|
| `objectNameField` | Field used as card title |
| `objectDescriptionField` | Field used as description text |
| `objectImageField` | Field containing image URL |
| `objectSummaryField` | Field used as summary |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `click` | `object` | Card clicked |
| `select` | `object` | Selection checkbox toggled |

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
