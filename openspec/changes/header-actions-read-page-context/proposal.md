---
kind: code
---

# Proposal: header-actions-read-page-context

## Summary

Board DqSociaalDomein draws "Overleg plannen" in the case header. dossiq configures it as a quick action
(`plan-case-meeting`, listed by the case type's `quickActions`) gated by
`visibleWhen: { "@context.caseType.category" in [Sociaal domein, Jeugd, Jeugdhulp] }`. On live, neither the button nor its
Actions menu entry appeared (r29 pageHeader buttons 3 vs 4). Header actions evaluate their local `visibleWhen` against
the object context (`cnObjectContext`), which held the record but not the page's `@context` records. The case type stayed
unread, and the fail-safe hid the action.

## What changes

- CnDetailPage puts its condition records (`visibilityRows`, the `@context` bag) into the provided object context as
  `context`, and syncs that again when the records arrive.
- `resolveObjectTokenContext` passes `context` through.
- `visibleWhen`'s local mode reads a `@context.<name>.<path>` field from that context. Without it, the action stays hidden,
  as before.

## Scope

`src/utils/visibleWhen.js`, `src/utils/detailObjectContext.js`, `src/components/CnDetailPage/CnDetailPage.vue`.
