# CnWorkingCalendarWidget

One month of a working calendar kept as an OpenRegister object: the weekdays that do not work in grey, the dates the
calendar is closed in red with their name, month navigation, and "Add day" for an administrator. Registered under the
`working-calendar` widget type, for dashboards and detail pages.

The board DqInstellingenAlgemeen draws it as "Werkdagen en feestdagen". The holidays are not computed in the browser:
the widget asks OpenRegister's calendar preview (`/api/flow-timers/calendars/preview`) for the year shown, which
expands the calendar's rules and its exceptions into dates, the same computation the business timers use.

## Content shape

```json
{
  "id": "working-days",
  "type": "working-calendar",
  "title": "Werkdagen en feestdagen",
  "content": {
    "calendar": { "register": "flow-timers", "schema": "working-calendar", "filter": { "slug": "default" } }
  }
}
```

| Key | Description |
|---|---|
| `calendar` | `{ register, schema, id? \| filter? }`: the calendar object, by id or as the first match of `filter` (tokens resolved; nothing is read while one is unresolved). The object carries `workingWeekdays` (ISO, 1 = Monday), `rules` and `exceptions`. |
| `previewUrl` | The preview endpoint, `/apps/openregister/api/flow-timers/calendars/preview` by default. It takes `{ calendar, year }` and answers `{ dates: [{ date, name }] }`. |
| `editable` | `false` hides Add day. Otherwise it shows for administrators. |
| `emptyText` | The text when no calendar is found. |

**Add day** appends `{ date, name }` to the object's `exceptions` with one update through the object API, under the
reader's own rights. OpenRegister lets only administrators update a working calendar, so the button shows for
administrators and a refusal reads "Only an administrator can change the working calendar". Clicking a day, or Enter
on it, opens Add day for that date. The calendar preview is for administrators too: anyone else sees the weekdays and
the added days, with a line saying the holidays could not be read.

## Keyboard and screen readers

The days form a grid with one tab stop. The arrow keys move a day or a week, Home and End to the start and end of the
week, Page Up and Page Down a month; moving past the month turns the page, and a live region reads the new month. Every
day is labelled with its full date and whether it is a working day, or closed and why ("vrijdag 25 december 2026,
gesloten: Eerste Kerstdag"). Today is marked with `aria-current="date"`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `content` | `Object` | `{}` | The configuration above. |
| `objectId` | `String\|Number` | `''` | The bound record's id, for `@objectId` in the filter. |
| `objectData` | `Object` | `null` | The bound record, for `@object.<field>` in the filter. |
