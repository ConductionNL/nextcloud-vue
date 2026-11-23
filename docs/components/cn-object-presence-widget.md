---
sidebar_position: 56
---

import GeneratedRef from './_generated/CnObjectPresenceWidget.md'

# CnObjectPresenceWidget

Who else has this record open, placeable from a manifest.

Registered as the widget type `presence`. A consuming app declares it and ships no component:

```json
{
  "type": "presence",
  "surface": "detail"
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `register` | `String` | `''` | The register the shown record lives in. Bound by the surface. |
| `schema` | `String` | `''` | The schema the shown record lives in. Bound by the surface. |
| `objectId` | `String` | `''` | The record on screen. Bound by the surface. |
| `max` | `Number` | `5` | How many faces before the rest become a count. |
| `size` | `Number` | `24` | Avatar size in pixels. |

It emits nothing and takes no slots.

## Why this exists when both halves are already exported

[`useObjectPresence`](../utilities/composables/use-object-presence.md) and [`CnPresenceAvatars`](./cn-presence-avatars.md) are both public, and an app could wire them into its own widget in twenty lines.

Then every app in the fleet would carry its own twenty lines, each slightly different, and a bug in any of them would need a release of that app to fix. One widget type, fixed in the library, is the version that stays fixed.

## The address comes from the surface, not from config

`CnDetailWidgetHost` already binds `register`, `schema` and `objectId` to every detail widget: the record the page is showing. A widget that asked for them in its own config would let a manifest point presence at a different record from the one on screen, and the avatars would be true and about somebody else's page.

They are read as getters, so a detail page that reuses one widget host across a route change stops beating on the record the reader left.

## It costs nothing until it has something to say

`CnPresenceAvatars` is silent on an empty list, and this adds no wrapper of its own. A placement takes no vertical space on the records where nobody else is reading, which is almost all of them.

Place it, then read [`useObjectPresence`](../utilities/composables/use-object-presence.md) if you need the count somewhere else on the page.

<GeneratedRef />
