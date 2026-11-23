---
kind: code
---

# Proposal: screens-record-list-value-labels

## Summary

pipelinq's My work prints a ticket's channel in the meta line with `{channel}`, which is the stored value ("phone"), and
the data holds two spellings for one channel ("phone", "telefoon"). A record-list template had no way to show a label
for a stored value.

`valueLabels` on a record-list maps a field's stored values to labels (`{ "channel": { "phone": "Phone", "telefoon":
"Phone" } }`); the templates (title, meta, text, trailing...) read the translated label, the pill, badges and sort keep
the stored value.

## Scope

CnRecordListWidget; docs; test. Widget content is free-form in the manifest schema, so no schema change.
