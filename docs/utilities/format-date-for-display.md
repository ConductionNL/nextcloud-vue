# formatDateForDisplay

Renders a date the way this person reads dates, without ever hiding the date.

Tuleap lets a person pick absolute or relative dates, and the reason for offering it is also the reason it is dangerous: "3 dagen geleden" against a statutory term is a reading hazard. A handler cannot work out from "3 days ago" whether a Woo request is on day 25 or day 29 of a 28 day term.

So the rule is not "relative or absolute". A relative date always carries its absolute date in the accessible name and in the tooltip. The exact date is one hover, one focus or one screen reader away, always.

## Usage

```js
import { formatDateForDisplay } from '@conduction/nextcloud-vue'

const shown = formatDateForDisplay(case.dueAt, { mode: 'relative', locale: 'nl-NL' })
```

```vue
<time :datetime="shown.iso" :title="shown.title" :aria-label="shown.accessibleName">
  {{ shown.text }}
</time>
```

Always render all three. In absolute mode they are the same date, so a caller writes one template and cannot accidentally drop the absolute date in relative mode.

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `mode` | `'absolute' \| 'relative'` | `'absolute'` | How this person reads dates. |
| `locale` | String | the browser's | BCP 47 locale. |
| `now` | Date \| Number | `Date.now()` | What counts as now. For tests. |
| `dateOptions` | Object | `{ dateStyle: 'medium', timeStyle: 'short' }` | `Intl.DateTimeFormat` options for the absolute form. |

## What it returns

| Key | In absolute mode | In relative mode |
|---|---|---|
| `text` | The date | "3 days ago" |
| `title` | The date | The date |
| `accessibleName` | The date | "3 days ago, 11 Sept 2026, 12:00" |
| `iso` | The ISO string, for a `datetime` attribute | The same |

A value that is not a date answers `null`, rather than rendering "Invalid Date" into a column.

## Next

Let each person choose their mode with [`useUserPreferences`](./composables/use-user-preferences.md), under `USER_PREFERENCE_KEYS.dateDisplay`.
