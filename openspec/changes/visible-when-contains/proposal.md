---
kind: code
---

# Proposal: visible-when-contains

## Summary

A case type can list the generic cards its overview shows (`overviewCards`), and each card asks whether the list names it. `in` asks whether a value is one of a list, `anyOf` whether two lists share an entry; neither asks whether a list holds one value. The visibleWhen operator `contains` does.

## Scope

- `src/utils/visibleWhen.js`: `contains` in `compareVisibleWhen`, so every visibleWhen surface (widgets, actions, form fields, row classes) reads it.
- Manifest schema: `contains` joins the visibleWhen `op` enum, added by the batch integration's bump. Until then a manifest using it fails validation.
