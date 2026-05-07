Basic — click the swatch to open the color picker popover:

```vue
<template>
  <div style="display: flex; align-items: center; gap: 12px;">
    <CnColorPicker :value="color" @input="color = $event.hex" />
    <span style="font-size: 13px; font-family: monospace;">{{ color }}</span>
  </div>
</template>
<script>
export default {
  data() {
    return { color: '#0082c9' }
  },
}
</script>
```

Locked to hex mode — hides the RGB/HSL toggle:

```vue
<template>
  <div style="display: flex; align-items: center; gap: 12px;">
    <CnColorPicker :value="color" mode="hex" @input="color = $event.hex" />
    <span style="font-size: 13px; font-family: monospace;">{{ color }}</span>
  </div>
</template>
<script>
export default {
  data() {
    return { color: '#e22d44' }
  },
}
</script>
```

Disabled state — swatch is not clickable:

```vue
<CnColorPicker value="#0082c9" :disabled="true" />
```

Multiple color pickers:

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div v-for="item in palette" :key="item.label" style="display: flex; align-items: center; gap: 12px;">
      <CnColorPicker :value="item.color" @input="item.color = $event.hex" />
      <span style="font-size: 13px;">{{ item.label }}: <code>{{ item.color }}</code></span>
    </div>
  </div>
</template>
<script>
export default {
  data() {
    return {
      palette: [
        { label: 'Primary', color: '#0082c9' },
        { label: 'Success', color: '#46ba61' },
        { label: 'Warning', color: '#e8a318' },
        { label: 'Error', color: '#e22d44' },
      ],
    }
  },
}
</script>
```
