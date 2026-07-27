---
sidebar_position: 46
---

import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnObjectCalendar.md'

# CnObjectCalendar

Month calendar that plots objects by a date property (`dateField`), with
optional day-spanning via `endDateField`. Navigating months emits
`range-change` so the host can (re)fetch objects for the newly visible
window — the component never fetches anything itself.

## Try it

<Playground component="CnObjectCalendar" />

## Props

<GeneratedRef />

Besides `objects`/`dateField`/`endDateField`/`visibleDate` above: `titleField`
picks the object property shown as an event's label (falls back to
`title`/`name`/the row key); `rowKey` is the object property used as each
object's identity (defaults to `id`); `maxEventsPerDay` caps how many events a
day cell shows before a "+N" overflow.

## Fetching pattern

`objects` is expected to already be scoped to the visible range — typically
the response of OpenRegister's
`GET /api/views/{id}/calendar?start=&end=`. Wire `range-change` (fired on
mount and after every month navigation) to a re-fetch:

```vue
<CnObjectCalendar
  :objects="objects"
  date-field="dueDate"
  end-date-field="endDate"
  :visible-date.sync="visibleDate"
  :loading="loading"
  @range-change="fetchCalendarObjects"
  @object-click="openObject" />
```

```js
async fetchCalendarObjects({ rangeStart, rangeEnd }) {
  this.loading = true
  const { data } = await axios.get(url, { params: { start: rangeStart, end: rangeEnd } })
  this.objects = data.objects
  this.loading = false
},
```

The emitted `rangeStart`/`rangeEnd` cover the full displayed grid (the month
padded to whole Sunday–Saturday weeks), matching the query parameters the
OpenRegister calendar endpoint expects.

## Slots

- `#day-event="{ object, day }"` — override a single day's event entry
  (default renders the object's title).
