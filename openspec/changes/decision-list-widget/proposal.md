---
kind: code
---

# Proposal: decision-list-widget

## Summary

ARCH-AUDIT MOVE item P1-13, board BeslisLijst. dossiq's MyArchivalReviews (DqMijnWerk) lists the destruction list entries a reviewer must answer, each with a verdict, a reason and a new date when retained. hermiq's ApprovalInbox, learniq's review queues and integriq's approvals draw the same thing as raw tables. CnDecisionListWidget is that worklist as a built-in widget, `decision-list`, configured from the manifest.

## Scope

- New `src/components/CnDecisionListWidget/`, exported, in `BUILT_IN_WIDGETS` and `BUILT_IN_WIDGET_KEYS`.
- Schema keys needed (no bump here): a `decision-list` entry in the v2 widget `props` conditionals, describing `props.content`.
