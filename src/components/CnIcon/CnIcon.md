Basic icon — `HelpCircleOutline` is always pre-registered as the fallback:

```vue
<CnIcon name="HelpCircleOutline" />
```

Sizes — the `size` prop controls pixel dimensions (default: `20`):

```vue
<div style="display: flex; gap: 16px; align-items: center;">
  <CnIcon name="HelpCircleOutline" :size="14" />
  <CnIcon name="HelpCircleOutline" :size="20" />
  <CnIcon name="HelpCircleOutline" :size="24" />
  <CnIcon name="HelpCircleOutline" :size="32" />
  <CnIcon name="HelpCircleOutline" :size="48" />
</div>
```

Fallback — unregistered names render the fallback icon:

```vue
<div style="display: flex; gap: 16px; align-items: center;">
  <span style="font-size: 13px; color: var(--color-text-maxcontrast);">Unregistered → fallback:</span>
  <CnIcon name="ThisIconIsNotRegistered" />
  <span style="font-size: 13px; color: var(--color-text-maxcontrast);">Custom fallback:</span>
  <CnIcon name="ThisIconIsNotRegistered" fallback="HelpCircleOutline" />
</div>
```

Registered icons — call `registerIcons()` in `main.js` before mounting Vue, then use by name:

```vue
<template>
  <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
    <CnIcon name="AccountGroup" :size="24" />
    <CnIcon name="FileDocumentOutline" :size="24" />
    <CnIcon name="Cog" :size="24" />
    <CnIcon name="Home" :size="24" />
    <CnIcon name="Magnify" :size="24" />
  </div>
</template>
<script>
import { registerIcons } from "@conduction/nextcloud-vue";
import AccountGroup from "vue-material-design-icons/AccountGroup.vue";
import FileDocumentOutline from "vue-material-design-icons/FileDocumentOutline.vue";
import Cog from "vue-material-design-icons/Cog.vue";
import Home from "vue-material-design-icons/Home.vue";
import Magnify from "vue-material-design-icons/Magnify.vue";
registerIcons({ AccountGroup, FileDocumentOutline, Cog, Home, Magnify });
export default {};
</script>
```
