# Proposal: detail-card-buttons-regular

## Why

The boards draw a labelled button in a card's title row at two heights. Setting and case-type pages draw it 34px
(DqZaaktype, DqZaaktypeOverzicht, DqCatalogus), the case page's tab cards draw it 40px like the page header's
controls (DqZaakContact "Live gesprek", DqZaakHistorie, DqZaakBetrokkenen). The board look drew every one at 34px
(COMPDIFF r25 DqZaakContact "Live gesprek": control height 34 vs 40). Both kinds are CnDetailPage with tabs, so the
page has to say which it is; the library cannot tell them apart.

## What changes

CnDetailPage takes `cardButtons` (manifest `config.cardButtons`): `compact` (the default, 34px, as before) or `regular`,
which draws the labelled buttons in the page's card title rows at the 40px control height in the board look.
