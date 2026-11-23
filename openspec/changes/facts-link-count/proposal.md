# Facts: a link with a count, and a long date with its time

## Why

Board PqContactmoment ends the client card with "Klantpagina, 4 eerdere contacten" and writes Wanneer as "7 oktober 2026, 09:12".

## What changes

- `link.countFrom` (`{ register, schema, filter? }`): the label's `{count}` is that list's total; `fallbackLabel` shows while it is not known.
- Format `longdatetime`: the month written out, the year and the time.
