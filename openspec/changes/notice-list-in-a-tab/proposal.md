---
kind: code
---

# Proposal: notice-list-in-a-tab

## Why

Board PtMededelingenActies draws a portal's notices in the portal page's Mededelingen tab as a whole list: quick filters with counts, Filter, search, selection, a pager and row menus, with the list's Actions menu (Vernieuwen, Importeren, Exporteren, Selectie kopiëren, Selectie verwijderen) at the end of the tab strip. portaliq showed a compact object list. The `index-list` widget draws the list, but four things were missing to draw it as the board does:

- each row leads with a tile whose icon and colour follow the notice's level (a warning triangle on the warning tone, an info circle on the primary tone), and the page's `rowIcon` could only be one icon for every row;
- the secondary line names where a notice shows, "toont op website en Mijn Zuiddrecht", and a list field read as "site,portal";
- the status pill reads "Nu zichtbaar" while a published notice's window runs and "Verlopen" after it, which no stored field holds;
- the list in a tab drew its own Actions button above the table, while the strip's menu beside the tabs offered only the widget entries;
- the primary Nieuwe mededeling drew first in the header, where this board, PtPortal and the Dq detail boards with a header primary (DqAanbesteding, DqKlachten, DqSubsidie, PqContract) draw it last;
- a row of the list opened nothing, where the compact object list opened the notice's page (`rowRoute`).

## What changes

- `rowIcon` also takes `{ field, icons, tones?, icon? }`: the icon (`icons[value]`, else `icon`) and its tile tone (`tones[value]`, else `rowIconTone`) follow a field of the row. The board look gains a `warning` tile tone in the warning pill's colours.
- A list field on a `secondary` line names each value through `secondaryLabels` and joins them as a list in the page's language.
- A column takes `valueWhen: [{ when, value }]`, the `rowClass` condition grammar: the first rule that holds names the cell's value.
- The board look orders a detail page's primary button last in the header row (`order`, so it stays first for the keyboard and the skip link).
- An `index-list` with `content.rowRoute` links and opens each row on that route.
- An `index-list` inside a tab panel hands its Actions menu entries (Import, Export, Copy selected, Delete selected, less those it turns off) to the tab strip's menu and draws no Actions menu of its own. The strip draws a selection entry disabled while nothing is selected. Outside a tab nothing changes.

## Scope

`CnDataTable` (rowIcon object, list labels, valueWhen), `CnIndexPage` (rowIcon type), `CnIndexListWidget`, `CnTabsWidget` (disabled panel items), `utils/rowClassRules.js` (exports `ruleHolds`), `look-board-index.css` (warning tile), `look-board-detail.css` (primary last). No manifest schema change (page config and columns are open). No new strings. Nothing changes in the Nextcloud look or on a page that does not use the keys.
