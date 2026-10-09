A switch between a few views of the same thing. It is a radio group: the arrow keys move the choice.

```vue
<template>
  <div>
    <CnSegmentedControl
      v-model="view"
      aria-label="View"
      :options="[
        { value: 'mine', label: 'My work' },
        { value: 'team', label: 'My team', count: 12 },
      ]" />
    <p>Chosen: {{ view }}</p>
  </div>
</template>

<script>
export default {
  data() { return { view: 'mine' } },
}
</script>
```

Stretched, with a disabled option:

```vue
<template>
  <CnSegmentedControl
    v-model="period"
    stretch
    aria-label="Period"
    :options="[
      { value: 'week', label: 'Week' },
      { value: 'month', label: 'Month' },
      { value: 'year', label: 'Year', disabled: true },
    ]" />
</template>

<script>
export default {
  data() { return { period: 'week' } },
}
</script>
```

Props: `options` lists the choices, `modelValue` is the chosen value (use `v-model`), `aria-label` names the group (or point `aria-labelledby` at a visible heading), `controls` names the id of the element the options switch (set as `aria-controls` on every option), and `stretch` fills the width. `size` is `normal` or `compact` (the board's 34px segments), and `mode` is `radio` or `toggle` (buttons with `aria-pressed`).
