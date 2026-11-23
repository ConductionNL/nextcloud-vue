---
kind: code
---

# Proposal: action-auth-matrix

## Summary

Three apps ship their own copy of the ADR-023 action x group rights matrix:
learniq (`src/components/admin/ActionAuthMatrix.vue`), launchpad
(`src/components/admin/ActionAuthMatrix.vue`, with an `@all` column) and
integriq (`src/views/admin/ActionAuthMatrix.vue`). The copies drifted: the
learniq one saved without the request token and reported success on the
refusal, which also emptied the matrix on screen (learniq audit S6).

This change adds one `CnActionAuthMatrix` that each app only configures with
its endpoint.

## Scope

- New `CnActionAuthMatrix` (`endpoint`, `fixedGroups`, `extraGroups`,
  `actionLabels`, `groupLabels`, `name`, `description`; emits `saved`).
- learniq adopts it in its admin page. launchpad (`extraGroups: [{ id: '@all',
  label: 'All logged-in users' }]`) and integriq switch in their own sweeps.
