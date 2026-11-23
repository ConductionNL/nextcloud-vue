---
kind: code
---

# Proposal: screens-record-list-avatar

## Summary

Rows of PqMijnWerk lead with a circle holding the customer's initials and carry the customer on the second line
("M. de Graaf · Mijn Zuiddrecht"). The `record-list` widget has the second line already (`meta`, with `extend` to read
the referenced customer) but no avatar.

`avatar` on a `rows` list: a name template ("{client.name}") drawn as a 36px circle with the initials of the first and
last word. No schema change (the record-list content is free-form).

## Scope

CnRecordListWidget, a small initials util; docs; tests; harness e2e (the page-controls harness). Opt-in.
