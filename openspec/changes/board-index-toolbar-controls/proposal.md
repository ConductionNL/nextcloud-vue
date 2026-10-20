# Proposal: board-index-toolbar-controls

## Why

Two controls in an index page's board toolbar did not draw what the board look asks for, because a Nextcloud or
theme rule outranked it:

- The search field is 40px in the board look, but Nextcloud's input rule (`input:not([type=radio]):not(...)`, nine
  attribute selectors) outranks the board selector and set it to the 34px clickable area (COMPDIFF r19: field h
  40 > 34 on DqContacten, DqOrganisaties, DqContracten, DqPostvak, DqTeamwachtrij, DqZaken).
- The Filter button kept NcButton's secondary border, which reads `--color-primary-element-light-hover`. The
  Zuiddrecht set makes that near white, so the button had no visible edge (COMPDIFF r19: "Filter" borderColor
  > rgb(240, 241, 243) on DqContacten, DqOrganisaties, DqContracten, DqTaken, DqTeamwachtrij, DqAanMijToegewezen,
  DqZoekresultaten, DqZakenKaart, DqZaken, DqWerkbord).

## What changes

In the board look the search field's height takes `!important`, and the Filter button (and the Filter menu button)
draws the board control border, `--cn-board-control-border`, like the toolbar's other neutral controls.
