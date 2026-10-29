---
kind: code
---

# Proposal: after-list-fit-table-auto-layout

## Summary

PqSocial draws "Sociale prestaties" under the posts list as a table with every
head whole (Netwerk, Gepubliceerd, Weergaven, Likes, Reacties, Gedeeld,
Volgers, Interactiepercentage). Live cut the heads and values to "G...",
"W...", "9...". The widget table (CnWidgetObjectTable, `fitWidth`) sits inside
the index page's table view, and the board look's rule that gives the index
table `table-layout: fixed` reached it too. Under the fixed layout the fit
table's `width: 1%` columns are 1% wide. The fixed layout now applies to the
index table only; a fit table keeps the auto layout, so each column other than
the growing one takes the width of its head and values on one line.
