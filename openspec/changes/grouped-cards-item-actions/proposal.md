---
kind: code
---

# Proposal: grouped-cards-item-actions

## Summary

learniq has three custom views that are groups of cards with an action per card: work groups (join, move here,
leave), optional lessons (sign up, withdraw) and the optional lesson roster (place a learner who did not sign up).
CnGroupedCardsWidget draws groups of cards from an endpoint and one action per group, but no action per card, no
counted text ("1 free place"), no line that depends on the group, and no second list per group. LQ4's programme
progress also needs a progress bar per group and a second list.

## Scope

Grow CnGroupedCardsWidget: `itemActions` with `@item` / `@group` tokens and a local `visibleWhen`, counted meta parts,
conditional group lines, `groupProgress`, and `extraItemsKey` with its own title, meta and actions. Docs and a jest spec.
