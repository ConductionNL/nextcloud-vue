# Proposal: search-placeholder-per-view

## Why

The cases list is one page with four views, and the boards ask its search differently per view: the list "Zoek op
zaak, nummer of verzoeker", the board view "Zoek op zaak of verzoeker" (DqWerkbord), the map "Filter op zaak of
aanvrager" (DqZakenKaart). The page had one placeholder for every view.

## What changes

`searchPlaceholderByView` (`{ table?, cards?, board?, map? }`) names the placeholder of a view; a view it does not name
keeps `searchPlaceholder`. No schema change: index page config is open.
