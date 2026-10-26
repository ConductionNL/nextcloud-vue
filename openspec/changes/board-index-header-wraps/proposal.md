---
kind: code
---

# Proposal: board-index-header-wraps

## Summary

Board DqOrganisaties draws narrow headers over two lines, "KvK- / nummer", "Lopende / zaken", "Open / tickets",
"Laatste / contact", with the chevron and funnel beside them; its header row is 58.5px. The board index table cut
every header label to one line ("KvK-n...", "Lopende zak...", "Laatste cont..."), so a reader could not tell the
columns apart.

In the board look an index header now wraps a label that does not fit. A label that fits stays on one line, so the
lists whose headers fit (DqZaken, DqTaken, DqContacten) do not change.

## Scope

- `src/css/look-board-index.css`: two rules.
- No schema change; the Nextcloud look is unchanged.
