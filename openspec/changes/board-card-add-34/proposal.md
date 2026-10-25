# Proposal: board-card-add-34

## Why

13 of the 15 Dq boards that draw a list card's Add in its title row draw it 34px, the title row's button size
(DqZaaktypeStatussen x4, DqZaaktype, DqZaaktypeOverzicht, DqZaaktypeRegels, DqZaaktypeVelden, DqCatalogus,
DqVthInstellingen x2, DqZaak and DqZaakMeer "Doel toevoegen"). Only DqZaakGerelateerd "Deelzaak aanmaken" and DqZaakTaken
"Toevoegen" draw 40. The library gave every list card's Add 40px, so the majority read 6px taller (compdiff r26a
DqZaaktypeStatussen Documenttypen/Besluittypen titleInsetTop 27.5 vs 30.5).

## What changes

The catalog card's Add has no size of its own and takes the title row's 34px. The two 40px boards are amended to 34 in
the design system (board vs majority).
