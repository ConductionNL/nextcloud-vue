# cell-config-growth

## Why

An app drew seven list cells of its own because the library cells lacked a few options: a number with a unit and a
warning chip, a value OpenRegister withheld, a "held until a date" marker, a tooltip on a priority set by hand, and a
column that sorts on one field while it shows another. The store page showed its built-in items untranslated, and an
index page in the board look could not ask for its unread rows. Each gap is generic, so each one becomes an option of
the library and the app cells become manifest config.

## What changes

- CnCellRenderer `widget: "number"`: the value with `widgetProps.unit` (`{ one, other }`, `{count}`) and
  `widgetProps.flagWhen` (`{ field, equals | in, text, variant }`), a chip with text beside the number. An empty value
  is an empty cell.
- CnCellRenderer reads OpenRegister's withheld marker (`{ "@withheld": true, reason }`) before any other path: a lock
  icon (hidden from assistive technology), "Withheld", and the reason as the tooltip.
- `rowIndicators` entries take `after` and `before` (`"now"` or an ISO date): the indicator applies while the field's
  date is after or before that moment. An indicator's text and tooltip go through the app's translate.
- The built-in `badge` takes `widgetProps.titleWhen` (`{ field, equals | in, text }`): a tooltip when the row field
  holds.
- A table column takes `valueField`: the cell shows that row field (with its schema property) while the column key
  stays what the header sorts and filters on.
- CnStorePage runs the title and description of each built-in item through the app's translate.
- CnIndexPage takes `showUnreadRows` (manifest `config.showUnreadRows`): `true` marks unread rows in every look,
  `false` never, and unset keeps the look's default.

## Fleet reuse

- pipelinq `views/leads/cells/LeadCloseDateCell.vue` is the `date` cell with `due`.
- pipelinq PipelineCard "stale" is the `number` (or `age`) cell with `flagWhen`.
- planninq and pipelinq priority maps are the badge `colorMap` with `valueField` and `titleWhen`.
