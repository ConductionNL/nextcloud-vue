# Proposal: board-tags-shape

## Why

The boards draw one tag: a 12px-radius rounded rectangle, 13px at weight 600 on a 3px 10px pad, 21px tall (DqZaak's
header pills, DqZaken's status column, DqZaaktype's version tag). COMPDIFF r18: a table cell's tag stood 24.2px tall
(the board-look table rule set a 1.4 line), and a small badge stayed Nextcloud's 17.8px full pill at weight 500 (the
board rule left `--small` out).

## What changes

In the board look every CnStatusBadge, small ones included, takes the board tag, and a table cell's tag sits on a
normal line. Measured live: dossiq's tasks list 24.2px → 21px.

## Scope

Board-only. In the default Nextcloud look a status badge is a full pill, as Nextcloud's own tags are; that is not a
mistake and stays. The 38px quick-filter and saved-view chips keep their full-pill shape (their own rules). Not here:
a 400-weight full pill on DqZaken with a #fdf2e5 ground, which is not a library tag (dossiq's own) and goes to the
dossiq lane.
