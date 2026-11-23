The current week as day columns. This example uses static items; in an app the items usually come from an OpenRegister `source`.

```vue
<template>
  <CnWeekStripWidget :content="content" />
</template>

<script>
export default {
  data() {
    const day = (offset) => {
      const now = new Date()
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7) + offset)
      return [monday.getFullYear(), String(monday.getMonth() + 1).padStart(2, '0'), String(monday.getDate()).padStart(2, '0')].join('-')
    }
    return {
      content: {
        emptyText: 'No deadlines',
        items: [
          { title: 'Parking permits city centre', meta: '2026-0061 · Woo', date: day(0) },
          { title: 'Objection parking fine', meta: '2026-0074 · Objection', date: day(2) },
          { title: 'Tender youth care', meta: '2026-0058 · Woo', date: day(4) },
        ],
      },
    }
  },
}
</script>
```

Props: `content` holds the configuration (see the component description), `translate` is an optional translate function for the texts in it, and `now` sets the moment the strip treats as now.
