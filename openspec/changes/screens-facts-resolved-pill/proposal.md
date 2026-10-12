---
kind: code
---

# Proposal: screens-facts-resolved-pill

## Summary

A facts entry can resolve a reference to the label of the referenced object (`resolve`), and an entry can be a pill
(`as: "pill"`). Together they showed the label, but the pill's tone was looked up by the stored id only, so a status
that is a reference could not be coloured. This change makes a resolved value a full pill: `map` works on the resolved
label, and `variantMap` / `colorMap` look the tone up by a configured field of the referenced object
(`resolve.toneField`), then by the resolved label, then by the stored value.

## Scope

- `src/components/CnFactsWidget/CnFactsWidget.vue`: the pill's tone lookup, `colorMap` as an alias of `variantMap`,
  `resolve.toneField` read through the shared label resolver.
- No manifest schema change: widget `content` is free-form, so no schema version is taken.
- An entry without `resolve` renders exactly as before.
