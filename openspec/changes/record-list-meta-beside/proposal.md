# A record list row with its meta beside the title

## Why
DqTermijnen "Jaarlijkse dwangsomaudit" draws its total as one line: "Totale dwangsom in 2026: € 1.442,00" and, 14px after it, "1 betaling, geen betwist". Live draws the meta under the title in a padded row, and the table under it starts 45px lower (r36 y +26.9 after the -18 above it).

## What changes
- CnRecordListWidget `metaBeside: true` (rows): title and meta on one baseline, 6px 14px apart, wrapping on a narrow card; the meta at 14px, also over the board dashboard's 13px meta.
- With `density: "stacked"` the row has no padding of its own, a one-line summary.
