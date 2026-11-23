# Proposal: links-page-board-header

## Why

COMPDIFF pl2, pipelinq PqModules and PqReports: a `links` page drew its title as a plain h2 inside a 20px padding with a
56px inset, so the board's page header ("Modules en meer", h1 28px with the buildiq square on its row) read as missing,
the buildiq square was missing, and the page sat outside the board's content frame.

## What changes

In the board look, `CnLinkCardsPage` draws the page header as the other board pages do: the title as the page's h1 with
the buildiq square at the end of its row, the description 6px under it, the header padded 4px above and 8px under; the
page takes the board content frame (padding, width, no ground of its own) and its sections stand 20px apart. The
Nextcloud look keeps its h2.
