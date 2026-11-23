# Proposal: board-detail-card-title-icon

## Why

A detail page's card drew its widget's icon before its title. The boards title those cards with the text alone, so the
title sat 36px further in than the board's 23px (COMPDIFF r19: header.titleInsetLeft 23 > 59 on DqContact "Contact",
DqOrganisatie "Organisatie", DqHandhaving "De overtreding", DqZaakGerelateerd, DqZaakEmail).

## What changes

In the board look a card on a detail page draws no title icon. The widget keeps its `icon` for the places that list it.
