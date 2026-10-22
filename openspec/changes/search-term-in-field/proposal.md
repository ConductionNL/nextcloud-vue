# The search term stands in the search field and on the Active line

## Why

DqZoekresultaten opens on `?q=Lindelaan`. The board draws Lindelaan in the search field and a "Zoekterm: Lindelaan" chip on the Active line, with its remove button. Live left the field empty, and searching from the field did not change the search.

## What changes

- The search source searches with the page's search field (`searchParam: 'term'`). It offers the term in the address as the field's first value (`initialSearch`).
- The address only counts for the first search, so clearing the field clears the search.
- A source with `termChip: true` puts "Search term: {term}" first on the Active line. Removing the chip, or Clear all, clears the term.
