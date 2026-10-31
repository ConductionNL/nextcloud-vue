---
kind: code
---

# Proposal: action-visible-follows-workspace

## Summary

PqWerkplekKlant (pl6, 30 Oct): in a call the header still shows "Contact vastleggen" beside "Beëindigen en afronden"; the board leaves it out, since the in-call page has its own contact form. pipelinq can hide it with `visibleWhen: { workspace: "callActive", op: "neq", value: true }`, but CnActionButtons evaluated an action's `visibleWhen` only when the actions or the object context changed. The call starts after the page has mounted, so a workspace condition kept its first answer.

CnActionButtons now evaluates the actions again when the injected workspace changes.

## Scope

- `src/components/CnActionButtons/CnActionButtons.vue`: a deep watcher on `workspaceCtx`.
- No schema change.
