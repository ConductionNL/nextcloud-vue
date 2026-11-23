# Design: abstract-start-card

- The start card is a flex row that wraps: text `flex: 1 1 320px`, control `flex: 0 1 480px` (min 240px), gap 16px 24px,
  link after the control. Title 17px / 700, guidance `--color-text-maxcontrast`, max 420px: PqDashboard's card.
- The card chrome stays the host's (the dashboard cell card). The manifest sets `showTitle: false` so the card title
  is not drawn twice.
- `objectSource` renders CnResourceSelect: it searches OpenRegister server side and emits the object id, which is
  written to the workspace like any other pick. `clearable` only with `allLabel`.
- The first-object default is one `GET /apps/openregister/api/objects/{register}/{schema}?_limit=1`, skipped when the
  workspace already holds a value, when `default` is set, or with `allLabel`. A failed read selects nothing.
- The accessible name of the combobox is `objectSource.ariaLabel`, else the title, else the label, else the key.
