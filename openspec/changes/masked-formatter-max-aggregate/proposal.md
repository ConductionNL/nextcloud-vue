# Proposal: masked-formatter-max-aggregate

## Why

DqOrganisaties shows an organisation's IBAN masked ("*****4300") and its latest contact date ("Laatste contact"). The
facts widget can mask a value, but a list column could not; a column aggregate could only count related objects.

## What changes

- A built-in cell formatter `masked`: all but the last characters become `*` (at most five, so the length does not
  leak); `formatterOptions.visible` sets how many stay (default 4). The same rule as the facts widget's `masked` format.
  It masks the display only and is not an access control: the full value is still in the row the page received, and a
  value the reader must not have belongs hidden in OpenRegister.
- A column aggregate `op: "max"` with `field`: per row, the highest value of `field` among the related objects (one
  request, `_limit=1` sorted descending), shown through the column's formatter; none shows `zeroLabel`, else a dash.
- No manifest schema change: columns are free-form.
