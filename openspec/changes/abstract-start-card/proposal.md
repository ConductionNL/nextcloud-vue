---
kind: code
---

# Proposal: abstract-start-card

## Summary

Ruben, 11 Oct 2026: pages are manifest configuration over abstract widgets.

PqDashboard opens with a "Contact starten" card: a title and a guidance line left, a client search right, which puts a
client in focus for every widget below. pipelinq draws it with two app components (`WerkplekContactStart` around
`WerkplekClientSelect`), because the library `workspace-filter` widget, which already writes a value into the page
workspace for its siblings, has no card layout and no object picker: its `source` is a grouped facet (distinct values),
and an `endpointSource` reaches only the page it fetched.

This change gives `workspace-filter`:

1. `layout: "start"` with `title`, `description` and `link`: the start card.
2. `objectSource: { register, schema, labelField? }`: an OpenRegister object picker (CnResourceSelect, server search)
   that writes the picked id and selects the first object when nothing is chosen.

Every app with a workspace page can then declare its start card (a case, a client, a supplier in focus).

## Scope

CnWorkspaceFilterWidget only; docs; unit tests; harness e2e. No schema change (widget content is open). Opt-in: without
the keys the widget renders as before.
