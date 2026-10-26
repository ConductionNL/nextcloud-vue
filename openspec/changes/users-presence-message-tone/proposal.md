---
kind: code
---

# Proposal: users-presence-message-tone

## Summary

The members list draws a member's day as a pill: present green, an absence orange, and a status message such as "Buiten" blue (DqAfdelingen). Live gave every line that was not "present" or "away" the orange warning tone, so "Buiten" read as an absence. An absence now registers its own line as a warning; any other line takes the information tone.

## Scope

- `src/composables/indexSources.js` (users source), a jest test.
