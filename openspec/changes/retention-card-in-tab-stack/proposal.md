# Proposal: retention-card-in-tab-stack

## Why

dossiq's Archiving tab became a stack (retention over custody). In a stack the detail widget host wraps only content-only types and consumer widgets that ask for the card, so CnRetentionWidget, which draws its own title row, rendered bare: no border, no background (COMPDIFF r25 DqZaakArchivering: card "Archivering" missing on live).

## What changes

- A library registry entry that owns its title (`ownsTitle`) and asks for the card (`chrome: "card"`) stands in an untitled CnWidgetWrapper on a card surface outside a body grid cell. Its own title row stays inside.
- The `retention` entry asks for the card.
- Bare chrome and grid cells are unchanged. No manifest schema change.
