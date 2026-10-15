---
kind: code
---

# Proposal: register-mapping-collapsed-groups

## Summary

Pipelinq's admin page holds a register mapping of six groups. Every group draws its register select and its full type list, so the card is about 2,700px tall and the other column of the settings grid stays empty.

With more than one group, `CnRegisterMapping` now draws each group as a heading with a button that opens and closes it (the WAI-ARIA accordion pattern). The groups start closed and show their configured count ("2/8 configured") while closed. The closed body stays in the DOM (`v-show`), so a group keeps its selection when it closes. A single group renders as before. `collapseGroups` forces either way.

## Scope

- `src/components/CnRegisterMapping/CnRegisterMapping.vue`: `collapseGroups` (default `null`, auto), the heading button, `aria-expanded` / `aria-controls`.
- No schema change.
