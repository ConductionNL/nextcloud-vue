# Settings and detail tables can sort and filter from their column heads

## Why

Several boards draw a sort button and a 22px column-filter button in each
head cell, as the index table does:

- DqInstellingen ("Koppeling", "Bron", "Status", "Laatste contact")
- DqVthInstellingen ("DSO-activiteit", "Regel", "Grondslag", "Bedrag")
- DqZaakContact ("Datum", "Kanaal", "Richting", "Samenvatting")

Live drew a plain label. The settings table (CnWidgetObjectTable) could not
turn either on. The detail list (CnObjectListWidget) could sort, but had no
column filter.

## What changes

- CnWidgetObjectTable gains `sortable` (`true` or the column keys) and
  `filterable`. Both apply where the widget fetches its own rows (`source`). A
  header sort replaces `source.order` while it is set. Header filters go out
  as the index page's parameters.
- CnObjectListWidget gains `content.filterable`, next to its existing
  `content.sortable`. A header filter joins the list's fetch.
- Both are opt-in. Without them the heads stay plain labels.
- A shared helper, `utils/headerFilterState.js`, keeps the filter map and
  turns it into request parameters.
