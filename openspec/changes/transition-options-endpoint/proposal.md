---
kind: code
---

# Proposal: transition-options-endpoint

## Summary

learniq's SubstitutionModal picks a substitute teacher from `/api/substitution/candidates` and a room from the rooms
list: choices read from an endpoint for the lesson at hand. CnTransitionInputFields only reads choices from its
`context`, so the host has to fetch them. A select input gains `optionsEndpoint`.

## Scope

CnTransitionInputFields, docs, jest spec.
