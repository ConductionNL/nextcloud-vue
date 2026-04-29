# CnColorPicker

Themed wrapper around vue-color's `Chrome` picker. Forwards all props and events to the underlying component, so the full vue-color API stays available — this component only exists to remap the picker's hardcoded light-mode palette to Nextcloud CSS variables so it follows the active theme (light, dark, or nldesign).

## Usage

```vue
<template>
  <CnColorPicker
    :value="color"
    :disable-alpha="false"
    @input="onInput" />
</template>

<script>
import { CnColorPicker } from '@conduction/nextcloud-vue'

export default {
  components: { CnColorPicker },
  data() { return { color: '#3eb0c8' } },
  methods: {
    onInput(c) {
      // c.hex / c.hex8 / c.rgba / c.hsl / c.hsv / c.a / c.source
      this.color = c.hex
    },
  },
}
</script>
```

## Props & events

All props and listeners are forwarded to vue-color's `Chrome` component. The most commonly used:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string \| object` | — | Current color (string like `'#abcdef'`, `'rgba(...)'`, `'hsl(...)'`, or a vue-color color object). |
| `disabled` | `Boolean` | `false` | Disables the swatch trigger and prevents the popover from opening. |
| `mode` | `'hex' \| 'rgb' \| 'hsl' \| null` | `null` | Lock the numeric-input fields to a single mode and hide the toggle. `null` lets the user switch. The shown fields include alpha when `disable-alpha` is `false` (so `'rgb'` becomes RGBA, `'hsl'` becomes HSLA). |
| `disable-alpha` | `Boolean` | `false` | Forwarded to `Chrome`. Hides the alpha bar and the alpha numeric field. |
| `disable-fields` | `Boolean` | `false` | Forwarded to `Chrome`. Hides the hex/RGB/HSL numeric fields entirely. |

| Event | Payload | Description |
|-------|---------|-------------|
| `input` | `{ hex, hex8, rgba, hsl, hsv, a, source }` | Fires whenever the user changes the color via any control. |

See vue-color's [`Chrome` component](https://github.com/linx4200/vue-color) for the full prop and event surface.

## Theming

This component remaps the following Chrome internals to Nextcloud variables:

| Chrome class | Bound to |
|--------------|----------|
| `.vc-chrome` (root) | `--color-main-background`, `--color-main-text`, `--font-face` |
| `.vc-chrome-body`, `.vc-chrome-saturation-wrap`, `.vc-chrome-color-wrap`, `.vc-chrome-active-color` | `--color-main-background` |
| `.vc-chrome-toggle-icon-highlight` | `--color-background-hover` |
| `.vc-hue-picker`, `.vc-alpha-picker` | `--color-main-background`, `--color-box-shadow` |
| `.vc-chrome-fields .vc-input__input` | `--color-main-background`, `--color-main-text`, `--color-border` |
| `.vc-chrome-fields .vc-input__label` | `--color-text-maxcontrast` |
| `.vc-chrome-toggle-icon svg path` | `--color-main-text` |

Consumers don't need to add any CSS overrides themselves.

## Notes

- This is purely the picker UI. It does not include a swatch trigger, popover, text input, or format conversion — wire those at the call site if you need them.
- `vue-color` is a direct dependency of this library, so the picker is always available.

## Related

- [`Chrome` component (vue-color)](https://github.com/linx4200/vue-color) — Underlying picker.
