---
kind: code
---

# Proposal: register-mapping-board-look

## Summary

The board PqBeheer draws the register configuration as one open group and compact rows. The open group has its name, a status chip ("Alle soorten ingesteld"), the register select and a "Soort object / Schema" table with a check icon on every configured type. The other groups are rows with a chevron, the name, "N soorten" and a status chip ("Ingesteld", "Niet ingesteld", "7 van 9 ingesteld"). "Configuratie opslaan" sits bottom right.

`CnRegisterMapping` draws that in the board look (its `look` prop or the provided `cnLook`). The default look is unchanged.

The mapping also loaded every register with its schemas expanded (`registers?_extend[]=schemas`): 9 MB and about 3 s on the development instance with 56 registers. It now lists the registers without their schemas (144 kB) and fetches the schemas of the mapped registers only, through `registers/{id}/schemas` (582 kB for pipelinq's register), in parallel with the list. A register chosen later is fetched when chosen, and a configuration that arrives after mounting fetches its registers then. Where `registers/{id}/schemas` is missing (404) the mapping falls back to the register with its schemas expanded.

## Scope

- `src/components/CnRegisterMapping/CnRegisterMapping.vue`: `look`, `boardRowLimit`, the board template and styles, the lean fetch.
- `l10n/en.json`, `l10n/nl.json`: the board strings.
- No schema change.
