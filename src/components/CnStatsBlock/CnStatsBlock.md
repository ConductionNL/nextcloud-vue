Vertical (default) — centered count and label:

```vue
<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; max-width: 600px;">
  <CnStatsBlock title="Cases" :count="42" count-label="open" />
  <CnStatsBlock title="Contacts" :count="128" count-label="total" variant="success" />
  <CnStatsBlock title="Tasks" :count="7" count-label="due today" variant="warning" />
  <CnStatsBlock title="Overdue" :count="3" count-label="items" variant="error" />
</div>
```

Horizontal with icon — icon on the left, content on the right:

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 8px; max-width: 300px;">
    <CnStatsBlock
      title="Open Cases"
      :count="42"
      :icon="BriefcaseOutline"
      variant="primary"
      horizontal />
    <CnStatsBlock
      title="Resolved"
      :count="284"
      :icon="CheckCircleOutline"
      variant="success"
      horizontal />
  </div>
</template>
<script>
import BriefcaseOutline from 'vue-material-design-icons/BriefcaseOutline.vue'
import CheckCircleOutline from 'vue-material-design-icons/CheckCircleOutline.vue'
export default {
  data() {
    return { BriefcaseOutline, CheckCircleOutline }
  },
}
</script>
```

With breakdown — secondary stats shown below the count:

```vue
<div style="max-width: 200px;">
  <CnStatsBlock
    title="Objects"
    :count="4821"
    :breakdown="{ published: 4200, draft: 421, archived: 200 }" />
</div>
```

Clickable — hover effect and click event:

```vue
<template>
  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; max-width: 400px;">
    <CnStatsBlock
      title="Open"
      :count="15"
      variant="primary"
      clickable
      @click="last = 'Open'" />
    <CnStatsBlock
      title="Closed"
      :count="89"
      variant="success"
      clickable
      @click="last = 'Closed'" />
  </div>
  <p style="margin-top: 8px; font-size: 13px;">Clicked: {{ last || '—' }}</p>
</template>
<script>
export default {
  data() { return { last: '' } }
}
</script>
```

Loading / empty states:

```vue
<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 450px;">
  <CnStatsBlock title="Loading" :count="0" :loading="true" />
  <CnStatsBlock title="Empty" :count="0" />
  <CnStatsBlock title="Zero shown" :count="0" :show-zero-count="true" />
</div>
```
