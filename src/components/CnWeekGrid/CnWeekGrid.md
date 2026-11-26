One week as a timetable. This example uses the current week; in an app the host fetches the entries for the week `week-change` asks for.

```vue
<template>
  <CnWeekGrid :week="week" :rows="rows" :items="items" caption="Week timetable" @week-change="week = $event" />
</template>

<script>
export default {
  data() {
    const now = new Date()
    const day = (offset) => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7) + offset)
      return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
    }
    return {
      week: now,
      rows: [
        { key: '1', label: '1st hour', start: '08:30', end: '09:20' },
        { key: '2', label: '2nd hour', start: '09:20', end: '10:10' },
      ],
      items: [
        { key: 'a', date: day(0), row: '1', title: 'Maths', meta: ['H4b', 'room 12'] },
        { key: 'b', date: day(2), row: '2', title: 'English', meta: 'H4a', pill: { label: 'Room 14', variant: 'changed' } },
        { key: 'c', date: day(4), row: '1', title: 'History', pill: { label: 'Cancelled', variant: 'cancelled' } },
      ],
    }
  },
}
</script>
```

Props, events and slots: `week`, `days`, `rows`, `items`, `caption`, `navigation`, `loading`, `emptyText`, `now`; events `week-change` and `item-click`; slot `item`. See [docs/components/cn-week-grid.md](../../../docs/components/cn-week-grid.md).
