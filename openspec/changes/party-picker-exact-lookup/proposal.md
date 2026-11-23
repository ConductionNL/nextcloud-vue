---
kind: code
---

# Proposal: party-picker-exact-lookup

## Summary

After openregister #4843 a BSN takes no part in free-text search, so the party picker no longer finds a person by
typing a BSN. The coordinator decided (24 Oct) on an exact "zoek op BSN" lookup that the app guards and logs (dossiq's
guarded citizen lookup), not free text.

A picker source may declare `lookup: { url, when }`. A typed term that wholly matches `when` (a regular expression,
"^[0-9]{9}$" for a BSN) is POSTed as `{ term }` to the app's `url` instead of the free-text search; the answer's
`results` are shown as that source's rows. A POST keeps the number out of URLs and server logs. Other terms search as
before.

## Scope

- `src/components/CnPartyPicker/CnPartyPicker.vue`.
- No schema change (a source is an open object in a field override).
