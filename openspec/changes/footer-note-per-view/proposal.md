# Proposal: footer-note-per-view

## Why

Board DqZakenSorteren's cards view reads "10 van 10 · gesorteerd op termijn, oplopend · sorteren via het zijpaneel · 20
per pagina" on its footer; the table view says "klik een kolomkop om te sorteren". An index page had one `footerNote`
for every view, so the cards view told the reader to click a column header it does not have.

## What changes

`config.footerNoteByView` (`{ table?, cards?, list?, board?, map? }`) gives a view its own footer note, as
`countTextByView` does for the count line. A view it does not name keeps `footerNote`. A scope's own note comes first,
and a saved view or query preset that sets `footerNote` clears the per-view notes, so its note stands in every view.
