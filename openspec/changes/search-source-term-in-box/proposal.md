# Proposal: search-source-term-in-box

## Why

Board DqZoekresultaten draws the search page with the term in the search box ("Lindelaan") and on the Active line as a
removable chip ("Zoekterm: Lindelaan"). The search source read its term only from the address's `?q=`, so the box on the
page stayed empty, typing in it searched nothing, and the Active line never named the term.

## What changes

The search source sends the page's search box as its term (`searchParam`), starts the box with the address's term
(`initialSearch`), and asks for a chip (`searchChip`). CnIndexPage shows "Search term: {term}" first on the Active
line for such a source; removing the chip or "Clear all" empties the box, and an emptied box searches nothing.
