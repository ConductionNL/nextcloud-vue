# Design: detail header field chips

## Component and surface

`CnDetailPage` (`src/components/CnDetailPage/`) header slot area, between the
title block and the actions. Kind: code in the library, config in the app.

## Manifest shape

```json
"config": {
  "headerFields": [
    { "key": "identifier", "format": "mono" },
    { "key": "caseType", "labelField": "name" },
    { "key": "status", "format": "badge", "labelField": "name", "colorField": "color" },
    { "key": "assignee", "format": "user" },
    { "key": "deadline", "format": "date", "warnWhenPast": true }
  ]
}
```

A plain string entry `"identifier"` equals `{ "key": "identifier" }`.

## Rendering rules

- Each entry renders an `NcChip`-styled element with the schema property's
  title as an `aria-label` prefix and the value as text.
- `format` picks the renderer: `text` (default), `mono`, `badge`, `user`
  (avatar and display name through `NcUserBubble`), `date` (relative, with a
  `title` holding the full date).
- A `$ref` value renders `labelField` of the referenced object. The lookup
  reuses the label resolver of `index-ref-column-labels`; an unresolved ref
  renders the raw id in `mono` and never blanks.
- `colorField` on a badge reads a colour name from the referenced object and
  maps it through the shared variant map (`success`, `warning`, `error`,
  `info`, `neutral`). Unknown values render neutral.
- `warnWhenPast` on a date adds the `error` variant when the date is before
  now.
- An entry whose value is empty renders nothing. The row renders only when at
  least one chip has a value.

## Layout

One flex row under the title, wrapping at narrow widths; chips never
truncate the title. On print the row renders as plain text.

## Alternatives considered

- A `header` widget slot: exists, but every app would write the same
  component. The chips are the common case; the slot stays for the rest.
- Reading the first five schema properties automatically: rejected, the
  order and the choice are the app's.
