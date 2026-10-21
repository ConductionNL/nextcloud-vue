# Proposal: board-grouped-cards

## Why

The grouped cards widget drew its groups and cards with the Nextcloud radius tokens, which a theme sets to 12px, and
with the widget's own spacing. DqZaaktype "Fasen en taken" draws a group padded 14px with a 10px radius and a bold
title, groups 14px apart, and its cards padded 9px 12px with an 8px radius and a 15px title (COMPDIFF r19b:
props.borderRadius 8 > 12 and 10 > 12, padding 9 > 10, header.fontWeight 700 > 600 on DqZaaktype).

## What changes

In the board look CnGroupedCardsWidget takes the board's group and card shape. Outside the board look nothing changes.
