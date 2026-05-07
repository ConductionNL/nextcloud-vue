---
sidebar_position: 30
---

# CnIcon

Renders an MDI (Material Design Icons) icon by PascalCase name from an extensible registry. Apps register only the icons they need — avoiding bundling all 7000+ MDI icons.

## Props

![CnIcon showing various icons in the Nextcloud navigation sidebar](/img/screenshots/cn-icon.png)

| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `name` | String | — | Yes | PascalCase icon name (e.g., `'AccountGroupOutline'`) |
| `size` | Number | `20` | No | Icon pixel size |
| `fallback` | String | `'HelpCircleOutline'` | No | Fallback icon name if `name` isn't registered |

## How It Works

CnIcon maintains an internal `_registry` map of `{ PascalCaseName: VueComponent }`. Only `HelpCircleOutline` is pre-registered as the fallback. Apps add their own icons at boot time using `registerIcons()`.

## Registering Icons

Import `registerIcons` from the library and call it before mounting Vue:

```js
// main.js
import { registerIcons } from '@conduction/nextcloud-vue'

import AccountGroupOutline from 'vue-material-design-icons/AccountGroupOutline.vue'
import FileDocumentOutline from 'vue-material-design-icons/FileDocumentOutline.vue'
import Cog from 'vue-material-design-icons/Cog.vue'

registerIcons({ AccountGroupOutline, FileDocumentOutline, Cog })
```

### Finding Icon Names

Browse the full MDI icon set at [pictogrammers.com/library/mdi/](https://pictogrammers.com/library/mdi/). Convert kebab-case to PascalCase:

| MDI Name | Import Path | Registry Key |
|----------|-------------|--------------|
| `account-group-outline` | `vue-material-design-icons/AccountGroupOutline.vue` | `AccountGroupOutline` |
| `file-document-outline` | `vue-material-design-icons/FileDocumentOutline.vue` | `FileDocumentOutline` |
| `sword-cross` | `vue-material-design-icons/SwordCross.vue` | `SwordCross` |

### Schema Icons

OpenRegister schemas reference icons by PascalCase name in their `icon` property. CnIndexSidebar and other components use CnIcon to render these. Make sure every icon referenced by your schemas is registered.

## Usage

```vue
<template>
  <CnIcon name="AccountGroupOutline" :size="24" />
  <CnIcon name="UnknownIcon" fallback="Cog" :size="16" />
</template>
```

## Exports

| Export | Type | Description |
|--------|------|-------------|
| `CnIcon` | Component | The icon renderer component |
| `ICON_MAP` | Object | Reference to the mutable registry |
| `registerIcons` | Function | `(icons: Record<string, Component>) => void` — adds icons to registry |
