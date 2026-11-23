# Proposal: record-list-rule-above-and-pill-first

## Why

DqZaakDocumenten draws "Weigeringsgronden tot nu toe" as rows that each start with the ground's code as a grey chip
("5.1.2e") before the ground's name, with a hairline above every row including the first, so the list is set off from
the card's header. CnRecordListWidget drew the code at the row's end and no rule above the first row (COMPDIFF r25:
header.separator 1 vs 0). Other boards draw no rule above the first row (DqZaaktype, DqTaak), so both are options.

## What changes

- `ruleAbove: true` draws the row separator above the first row too.
- `pillAt: "start"` draws the row's pill before the title instead of at the end.
