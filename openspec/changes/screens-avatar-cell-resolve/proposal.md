---
kind: code
---

# Proposal: screens-avatar-cell-resolve

## Summary

On board DcVergaderingen the Voorzitter column shows a 28px circle with the chair's initials and the name ("EV  Ellen
van Dam"). `meeting.chair` holds a Participant uuid. The `avatar` cell needs a name or a user id in the row, and
`fkResolve` resolves the name but draws no avatar.

The `avatar` cell now takes `widgetProps.resolve: { register, schema, labelField }`, the shape the facts widget's
`resolve` takes. The name is resolved the way an `fkResolve` cell resolves it, through the shared object store.

## Scope

- `src/components/CnFkResolveCell/CnFkResolveCell.vue`: a default slot `{ label, ids, resolved }`.
- `src/components/CnCellRenderer/CnCellRenderer.vue`: `avatarResolve`, `initialsOf`, and the resolved avatar branch.
- No schema change: column objects and `widgetProps` are open in the v2 manifest schema.
