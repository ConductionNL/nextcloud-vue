---
kind: code
depends_on: [screens-chrome-parity, screens-index-list-parity]
---

# Proposal: screens-cell-pill-parity

## Summary

On PqTickets and PqLeads the type and status values are coloured pills:
"Verzoek" and "Nieuw" in light primary, "In behandeling" and "Gekwalificeerd"
in purple, "Melding", "Wacht op klant" and "Voorstel" in warning, "Opgelost"
in success, "Klacht" in error, "Omgezet naar een zaak" in teal. Live, every
pipelinq pill is the same grey (round 6 gap list, pipelinq "Type / Status /
Channel values"). Two things are missing in the library:

1. Two of the board's tones, purple and teal, have no badge variant.
2. A manifest column cannot declare the colours; only the schema property
   (`colorMap` / `x-color-map`) or a `widget: "badge"` column could, and the
   badge widget looks the colour up by the translated label.

This change adds the `purple` and `teal` tones to `CnStatusBadge`, lets a
manifest column carry `colorMap` (raw value to tone), and under the board look
sets a primary pill in the deep primary ink the board draws.

The "Kanaal" (channel) column is plain text on the board, not a pill, so it
needs nothing here. The pill geometry (3px 10px, radius 12, 13px weight 600)
already shipped with `screens-index-list-parity`.

## Reference screens

| Screen | Live board |
|---|---|
| `pipelinq/PqTickets` (Type, Status) | https://identity.conduction.nl/screens/board?id=pipelinq/PqTickets |
| `pipelinq/PqLeads` (Fase) | https://identity.conduction.nl/screens/board?id=pipelinq/PqLeads |
| `vaartveld/LqTokens` (the seven pill tones side by side) | https://identity.conduction.nl/screens/board?id=vaartveld/LqTokens |

## Consumers

- pipelinq: `Tickets` columns `ticketType` and `status`, `Leads` column `stage`
  declare a `colorMap` (the app lane does this after merge).
- Any app with an enum column; a column without `colorMap` renders as before.
