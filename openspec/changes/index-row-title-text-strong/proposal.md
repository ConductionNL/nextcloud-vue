# Proposal: index-row-title-text-strong

## Why

The portaliq boards draw an index list's title column in the two looks CnDataTable already has for a card table:
PtInzendingen and PtNieuws as a 14px name at weight 600 in the main ink (`strong`), PtAanvraagformulieren as an ordinary
14px cell (`text`). An index page could not ask for either: CnIndexPage's `rowTitle` and the manifest schema took only
`link` and `plain`, so these lists drew the 15px underlined link or the 15px bold plain title.

## What changes

- CnIndexPage `rowTitle` accepts `text` and `strong` and passes them to CnDataTable, which draws them already.
- The manifest schema's index `config.rowTitle` takes the same four values (schema 2.171.0).
- Nothing changes for a page that sets no `rowTitle`, `link` or `plain`.
