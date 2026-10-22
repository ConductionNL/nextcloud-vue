# Proposal: conversation-all-chip-host-word

## Why

DqZaakContact's channel chips start with "Alles", as dossiq's own filter chips and the timeline's do. The conversation
thread used the library's word ("Alle").

## What changes

The All chip reads the host's translate for `All` when the host has one, and the library's word otherwise, the same
rule the timeline's kind chips follow.
