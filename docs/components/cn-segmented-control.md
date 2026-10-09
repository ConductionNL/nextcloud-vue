import GeneratedRef from './_generated/CnSegmentedControl.md'

# CnSegmentedControl

A switch between a few views of the same thing, such as "My work / My team". One option is always the chosen one.

```vue
<template>
  <CnSegmentedControl
    v-model="view"
    aria-label="View"
    :options="[
      { value: 'mine', label: 'My work' },
      { value: 'team', label: 'My team', count: 12 },
    ]" />
</template>

<script>
import { CnSegmentedControl } from '@conduction/nextcloud-vue'

export default {
  components: { CnSegmentedControl },
  data() { return { view: 'mine' } },
}
</script>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `options` | `Array<string \| { value, label, disabled?, count? }>` | required | The options. A plain string is both the value and the label. `count` shows a number after the label. |
| `modelValue` | `string \| number \| boolean` | `null` | The value of the chosen option (v-model). |
| `ariaLabel` | `string` | `''` | Accessible name of the group. |
| `ariaLabelledby` | `string` | `''` | Id of an element that names the group, as an alternative to `ariaLabel`. |
| `controls` | `string` | `''` | Id of the element the options switch, such as a page view region. Set as `aria-controls` on every option. |
| `stretch` | `boolean` | `false` | Stretch to the full width, with options of equal width. |
| `size` | `'normal' \| 'compact'` | `'normal'` | `compact` is the board's period group (34px segments in a 40px track). |
| `mode` | `'radio' \| 'toggle'` | `'radio'` | `toggle` renders buttons with `aria-pressed` in a `group`. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | the option's `value` | The newly chosen option. |

## Slots

| Slot | Bindings | Description |
|------|----------|-------------|
| `option` | `{ option, checked }` | Replaces the content of one option. |

## Accessibility

- The control is a `radiogroup` and each option a `radio` with `aria-checked`.
- Tab enters and leaves the group in one step and lands on the chosen option.
- Arrow keys move the choice, Home and End jump to the first and last option. Disabled options are passed over.
- The chosen option has a raised surface and a border, so it does not rest on colour alone.

## Segmented control or tabs?

Use `CnSegmentedControl` when the choice changes what the same page shows, such as a filter or a scope. Use [`CnTabs`](./cn-tabs.md) with `variant="segmented"` when each option has its own panel of content. Both look the same; the tabs keep the tab and panel semantics.

## Compact size and toggle mode

- `size="compact"` draws the board's period group: a track with 3px padding, a
  2px gap, radius 8px, and segments 34px high (the track is 40px), 14px/600
  text with radius 6px. An option with `iconOnly: true` is 40px wide. `normal`
  (the default) is unchanged.
- `mode="toggle"` renders plain buttons with `aria-pressed` in a `group`
  instead of a radio group, for a set of presets; Tab visits every button.
  The default `radio` mode is unchanged.
## Reference

<GeneratedRef />
