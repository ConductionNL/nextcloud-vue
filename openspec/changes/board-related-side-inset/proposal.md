# Proposal: board-related-side-inset

## Why

pl3 on :8080: the related-objects card in a pipelinq side column ("Gerelateerd" on PqTicket, PqTicketBesluitvorming,
PqTicketContactmomenten, PqTicketGerelateerd, PqTaak, PqLead, PqContactpersoon, PqKassabon) draws its rows 9px in from
the card's outer edge, where every board draws them 23px in, under the title. The widget sits in a flush wrapper, and
its rows, group titles and status lines carry only their own 8px.

## What changes

In the board look, the content of a related-objects card in a detail page's side column is inset 14px, so the 8px rows,
group titles and status lines land on the card's 22px inset. The link rows and "show all", which carry 16px, take 8px.
