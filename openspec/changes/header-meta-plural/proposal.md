---
kind: code
---

# Proposal: header-meta-plural

## Summary

Board DqOrganisatie's header line ends "· 1 lopende zaak". A record page can count a list for its header line
(`headerMetaCounts`, `{count:<name>}`), but the line was one template, so the noun could not follow the count:
"1 lopende zaken" or "2 lopende zaak". Translating the singular and the plural as separate forms is also what a
translator needs.

`headerMeta` may now be `{ count, one, other, zero? }`: the `headerMetaCounts` total named `count` picks `one` for 1,
`zero` (when given) for 0, and `other` otherwise. Each form is a whole template, translated on its own. While the
count is missing the line is left out, as for a string.

## Scope

- `src/components/CnDetailPage/CnDetailPage.vue`: `headerMeta` takes a string or an object; `headerMetaForm`.
- SCHEMA CHANGE: `config.headerMeta` is `oneOf` string or `{ count, one, other, zero? }`; version bumped
  (2.150.0 on this branch, renumbered at batch time) with its hash.
- Stacked on feat/r24-detail-header-meta-counts (402a55381b), which introduces `headerMetaCounts`.
