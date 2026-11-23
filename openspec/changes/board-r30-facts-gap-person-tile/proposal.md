---
kind: code
---

# Proposal: board-r30-facts-gap-person-tile

## Summary

r30 findings, both from rules this lane built earlier:

- DqContact "Contact" and DqOrganisatie "Organisatie" start their first label 11.8px under the title; the board starts it
  at 14. The two-column facts card takes the first line's leading off its 14px, but the board-look labels have sat on the
  normal line height since `board-facts-columns-plain`. The padding is now a plain 14px. The headless probe on :8080 reads
  the content padding 11.75 → 14, which moves the label down 2.25.
- DqSociaalDomein "Wie" draws its 28px initials circles on the light primary tint (the board's person chip). Live drew them
  grey.

## Scope

`src/css/look-board-detail.css`.
