# Design: screens-cell-date-parity

## The age widget

`widget: "age"` on a column renders `<time>` with the waiting time since the
cell's date:

- under 24 hours: whole hours, at least 1 ("4 uur"; a date in the future reads "0 uur");
- after that: whole calendar days, at least 1 ("1 dag", "3 dagen").

Calendar days, as `daysSince` and `dueRule` count them, so "yesterday at
23:59" is one day. The board's "gisteren" and "5 okt" in the Wachtend column
belong to resolved and converted tickets, whose waiting has stopped; showing a
stopped wait is a data choice of the app (it can point the column at a field
that holds the stop moment), not a cell form.

Colour: `widgetProps.variantWhen`, the `[{ op, value, variant }]` rules of the
`date` widget (first match wins), compared against the number of days the
cell SHOWS (0 under a day). Comparing the shown number keeps text and colour
in agreement: "23 uur" is never red under a "gte 1" rule. A matched cell is
weight 600 (the signal does not rest on colour alone); under the board look
every age cell is weight 600, as the board draws them. Red is the Nextcloud
error text colour, as the `date` widget's.

Plural units come from the library catalogue: `%n day` existed, `%n hour`
is added (en "hour/hours", nl "uur/uur").

## The board date

`src/utils/boardDate.js` holds the formatting. Under the board look:

- a schema property with `format: "date"` or `"date-time"` renders the short
  form in a `<time>` instead of the relative `NcDateTime`;
- the `date` widget renders the short form unless it asks for `showTime` or
  `timeOnly`.

The short form is `{ day: "numeric", month: "short" }`, plus the year when the
date is outside the current year ("14 feb 2024"). The full date is the
tooltip. The `<time datetime>` carries the ISO moment.

Language: Nextcloud keeps an account's locale (date order, first weekday)
apart from its language, and the locale defaults to en_US. `boardDateLocale()`
uses the locale only when it is a region of the user's language (`nl-BE` for
`nl`), and the language otherwise. The default look keeps its current
locale handling; changing it there would change every app.

The built-in `date` / `datetime` formatters are not changed: a formatter is a
pure function without the look, and a column that names one asked for that
form. Noted as a follow-up if a board needs it.

## The reference cell (no code)

Options considered for "a uuid in a list shows the referenced name":

1. A new `ref` cell widget that fetches per cell. Rejected: one request per
   row, which the gap rules out.
2. `fkResolve` (CnFkResolveCell): per-schema cache, but every cell still asks
   on its own when the cache is cold.
3. The batched `refLabel` path of `index-ref-column-labels`: CnIndexPage
   collects the distinct ids of the page per reference column, asks the
   object store once per referenced schema (`fetchCollectionForOptions` with
   `_ids`, `_fields`), uses objects the store already holds without a request,
   and hands the labels to the `refLabel` cell. Chosen: it exists and does
   exactly this. The ticket schema's `client` property (`format: "uuid"`,
   `$ref: "client"`) resolves against the page register.
