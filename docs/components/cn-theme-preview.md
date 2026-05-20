---
sidebar_position: 26
---

# CnThemePreview

Live CSS theme preview with colour pickers. Renders one `<input type="color">` per declared theme variable plus a preview panel that applies the picked colours as inline CSS variables. Emits the full colour map on every mutation so consumers can persist it server-side and apply it globally (e.g. on `<style>:root { --primary: …; … }`).

The default preview body shows a generic sample (header, button, list, link). Replace it via the `#preview` slot to drop the consuming app's actual chrome inside.

## Try it

```vue
<template>
  <CnThemePreview
    v-model="colours"
    :pickers="pickers"
    :defaults="defaults"
    @change="onColoursChanged" />
</template>

<script>
import { CnThemePreview } from '@conduction/nextcloud-vue'

export default {
  components: { CnThemePreview },
  data() {
    const defaults = { primary: '#21468B', background: '#FFFFFF', text: '#1B1B1B', accent: '#F0A300' }
    return {
      colours: { ...defaults },
      defaults,
      pickers: [
        { key: 'primary',    label: 'Primary',    default: defaults.primary },
        { key: 'background', label: 'Background', default: defaults.background },
        { key: 'text',       label: 'Text',       default: defaults.text },
        { key: 'accent',     label: 'Accent',     default: defaults.accent },
      ],
    }
  },
  methods: {
    onColoursChanged(map) {
      // Persist server-side. Apply globally elsewhere.
    },
  },
}
</script>
```

## Custom preview body

```vue
<CnThemePreview :pickers="pickers" :defaults="defaults">
  <template #preview="{ model }">
    <MyAppChrome :style="cssVarsFrom(model)" />
  </template>
</CnThemePreview>
```

The slot scope's `model` is the live colour map. Use it to compute inline CSS variables for the embedded chrome.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `pickers` | `Array<{key,label,default?}>` | — *(required)* | Picker declarations. `key` becomes `--<key>` on the preview panel + on the emitted map. |
| `value` | `Record<string,string>` | `{}` | Initial / controlled colour map. Falls back to each picker's `default`, then `#000000`. |
| `defaults` | `Record<string,string>\|null` | `null` | Default colours used by the Reset button. Null hides the Reset button. |
| `sampleTitle` | String | `'My app'` | Default preview — title. |
| `sampleButtonLabel` | String | `'Primary action'` | Default preview — button label. |
| `sampleBodyText` | String | `'This is how your app surface looks with the current theme.'` | Default preview — body paragraph. |
| `sampleItem1` / `sampleItem2` / `sampleItem3` | String | — | Default preview — list items (middle one is highlighted as "active"). |
| `sampleLink` | String | `'Sample link'` | Default preview — link text. |
| `resetLabel` | String | `'Reset to defaults'` | Reset-button label. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `change` | `Record<string,string>` | Emitted on every colour mutation. |
| `input` | `Record<string,string>` | v-model-friendly alias of `change`. |

## Slot

- `#preview` — replaces the default preview body. Scope: `{ model }`.

## See also

- The fleet-wide canonical colour set lives in the `nldesign` Nextcloud app and the brand-hex memory reference.
- Persist results via OpenRegister `appConfig` or a custom register; apply globally by writing `<style>:root { --primary: …; … }</style>` once at boot.
