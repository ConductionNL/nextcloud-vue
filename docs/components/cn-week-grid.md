# CnWeekGrid

One week as a timetable: the days as columns and the time slots as rows, such as a school's lesson hours or a training provider's start times. Each entry sits in the cell of its day and its slot, with a title, an optional meta line and an optional pill for a change (another room, cancelled, a substitute). Today's column is marked.

- Monday to Friday by default. Set `days` to `7` to add the weekend.
- The grid only draws what it is given. An entry whose `row` is not in `rows`, whose date falls outside the week, or that has no title is left out.
- With `navigation` (on by default) the grid shows Previous week, This week and Next week, and emits `week-change` with the Monday of the asked week. The host fetches that week and passes it in as `week`.
- An entry with `href` is a link. An entry without one is a button that only emits `item-click`. An unsafe `href` (anything but a root-relative path, http, https or mailto) is dropped.
- On a narrow screen the table scrolls sideways. The scroll area takes keyboard focus.

```vue
<CnWeekGrid
  :week="monday"
  :rows="[{ key: '1', label: '1e uur', start: '08:30', end: '09:20' }]"
  :items="[{ key: 'l1', date: '2026-10-05', row: '1', title: 'Wiskunde', meta: ['H4b', 'lokaal 12'], pill: { label: 'Lokaal 14', variant: 'changed' } }]"
  caption="Weekrooster"
  @week-change="loadWeek"
  @item-click="openLesson" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `week` | `Date \| string` | `null` | A day of the week to draw. The grid starts on its Monday. Empty for the week of `now`. |
| `days` | `number` | `5` | `5` for Monday to Friday, `7` for the whole week. |
| `rows` | `Array<{ key, label, start?, end? }>` | `[]` | The time slots, top to bottom. `start` and `end` (such as `08:30`) are shown under the label. |
| `items` | `Array<{ key, date, row, title, meta?, pill?, href? }>` | `[]` | The entries. `date` is `YYYY-MM-DD` or a Date, `row` the key of its slot. `meta` is a string or a list of strings, joined with ", ". `pill` is `{ label, variant }` with variant `changed`, `cancelled`, `substitute` or `info` (anything else draws as `changed`). |
| `caption` | `string` | `''` | The table's caption, also the name of its scroll region (else "Week timetable"). |
| `navigation` | `boolean` | `true` | Show Previous week, This week and Next week above the grid. This week is disabled on the current week. |
| `loading` | `boolean` | `false` | Show a loading state instead of the table. |
| `emptyText` | `string` | `''` | The text when there are no rows. Defaults to "Nothing planned this week". |
| `now` | `Date` | `null` | The moment the grid treats as now, for today and the current week. Empty for the current time. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `week-change` | `Date` | The Monday of the previous, current or next week. |
| `item-click` | `(item, event)` | An entry was activated. `item` is the entry as given in `items`. A link still follows its `href`. |

## Slots

| Slot | Bindings | Description |
|------|----------|-------------|
| `item` | `{ item }` | Replaces one entry of a cell. `item` is the entry as given in `items`. |

## Accessibility

- The grid is a `table` with the days as column headers and the slots as row headers, so a screen reader announces the day and the hour of each cell.
- Today's column header carries `aria-current="date"` and the word "today". It does not rest on colour alone.
- A cancelled entry has its title struck through and a pill that says so.
- The scroll region is focusable and named by the caption.
