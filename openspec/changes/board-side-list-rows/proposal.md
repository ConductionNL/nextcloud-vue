# Proposal: board-side-list-rows

## Why

Eight of nine Dq boards with a list in a side card draw a hairline over every row, the first too, so a line sits under
the card title (DqZaaktype, DqZaaktypeOverzicht, DqZaaktypeRegels, DqZaaktypeStatussen "Versies", DqTenant,
DqSociaalDomein, DqTaak, DqHandhaving, DqZoekresultaten). Live drew no line (compdiff r26a: header.separator 1 vs 0 on
the Versies card), underlined the row title (the plain `.cn-detail-page__side` rule marks side rows as links), and set
the footer note at 15px main ink, because the theme sets every paragraph through its tokens with `!important`.

## What changes

In the board look: a hairline over every side-card list row; the row title without an underline at rest (hover and
focus keep it); the footer note gets 13px and the muted ink through the theme's paragraph tokens. Checked on :8080 with
the rules injected.
