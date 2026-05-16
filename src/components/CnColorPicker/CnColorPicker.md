Basic — click the swatch to open the color picker popover. Use `hex8` (8-char hex with alpha) so the swatch preview reflects transparency changes:

```vue
<template>
  <div style="display: flex; align-items: center; gap: 12px;">
    <CnColorPicker :value="color" @input="color = $event.hex8" />
    <span style="font-size: 13px; font-family: monospace;">{{ color }}</span>
  </div>
</template>
<script>
export default {
  data() {
    return { color: '#0082c9ff' }
  },
}
</script>
```

Locked to hex mode — hides the RGB/HSL toggle:

```vue
<template>
  <div style="display: flex; align-items: center; gap: 12px;">
    <CnColorPicker :value="color" mode="hex" @input="color = $event.hex8" />
    <span style="font-size: 13px; font-family: monospace;">{{ color }}</span>
  </div>
</template>
<script>
export default {
  data() {
    return { color: '#e22d44ff' }
  },
}
</script>
```

Alpha disabled — `disable-alpha` is forwarded to the underlying `Chrome` picker, hiding the alpha slider and alpha numeric field. Bind to `$event.hex` here (the 6-char form) since alpha is irrelevant:

```vue
<template>
  <div style="display: flex; align-items: center; gap: 12px;">
    <CnColorPicker :value="color" :disable-alpha="true" @input="color = $event.hex" />
    <span style="font-size: 13px; font-family: monospace;">{{ color }}</span>
  </div>
</template>
<script>
export default {
  data() {
    return { color: '#46ba61' }
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
      <CnColorPicker :value="item.color" @input="item.color = $event.hex8" />
      <span style="font-size: 13px;">{{ item.label }}: <code>{{ item.color }}</code></span>
    </div>
  </div>
</template>
<script>
export default {
  data() {
    return {
      palette: [
        { label: 'Primary', color: '#0082c9ff' },
        { label: 'Success', color: '#46ba61ff' },
        { label: 'Warning', color: '#e8a318ff' },
        { label: 'Error', color: '#e22d44ff' },
      ],
    }
  },
}
</script>
```
