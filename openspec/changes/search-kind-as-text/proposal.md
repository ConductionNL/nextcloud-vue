# The search's kind column as plain text

## Why

DqZoekresultaten draws the Soort column as plain text that names what one row is, such as "Zaak" or "Lantaarnpaal". Live drew the plural kind ("Zaken") as a pill.

## What changes

- A search page opts in with `kindAsText: true`. The Kind column then reads `kindText` as plain text, and its header filter narrows on that text.
- Each kind names its rows with `rowLabel`. This is a template on the found object ("Case", "{objectType}"). Without one, the kind's label is used.
- Without the opt-in, the column stays as it was.
