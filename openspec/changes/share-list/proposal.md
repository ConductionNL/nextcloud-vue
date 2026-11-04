---
kind: code
---

# Proposal: share-list

## Summary

Board DqZaakBetrokkenen draws "Delen buiten de organisatie": one row per share of the case with someone outside the organisation (the case, a file, a mail), who made it and until when, a status pill, and the buttons "Link kopiëren" and "Intrekken"; a refused revoke shows in the card ("Intrekken geweigerd door OpenRegister: ..."). The library has the create side (CnShareCreate) but no list. CnShareList is that list as widget type `share-list`, generic over any record's shares.

## Scope

- New `src/components/CnShareList/` (registered as `share-list`, a content-only type so the detail card titles it and passes `objectId`), exported, catalog key.
- Revoke through the page dispatcher as an `api-call` with `noticeInline: 'error'` (card-state-notices), so a refusal lands in the card.
- `noticeInline: 'error'` in `noticeFromOutcome`: a refusal becomes a notice, a success keeps its toast.
- Library strings (en + nl), docs page.

## Out of scope

- Reading and revoking shares on the server (dossiq SIG, through the OpenRegister shares leaf).
- Creating a share: the card's `headerActions` opens the app's dialog over CnShareCreate.
