# Proposal: audit-label-changed-values

## Why

Board DqSociaalDomein's side "Historie" card reads, for a case whose reader
stated why they opened it, "Inzage ... doel onderzoek". dossiq records that
purpose on the case's audit trail (`dossiq.case.access-purpose`, the purpose in
the entry's `changed`). An action label could fill in only `{actor}` and
`{state}`, so the purpose could not be said.

## What changes

An action label may quote a value the entry recorded as `{changed.<key>}`.
`valueLabels` (`{ purpose: { handling: "Handling" } }`) gives the value its
words, through the app's translate; a value without words shows as written.
