# Tasks: timeline-visibility-controls

> The render half of openregister's `timeline-entry-visibility`, task 2.2 (ADR-032 `kind: code`).
> Checkbox budget: 3 tasks x 2 = 6 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: The chip and the toggle on `CnNotesCard`
- **spec_ref**: `openspec/changes/timeline-visibility-controls/specs/notes-mentions-autocomplete/spec.md#requirement-a-note-shows-and-sets-whether-it-is-internal-or-public`
- **files**: `src/components/CnNotesCard/CnNotesCard.vue`, `tests/components/CnNotesCard.chromeless.spec.js`, `docs/components/cn-notes-card.md`
- **acceptance_criteria**:
  - Every note renders a chip reading internal or public, distinguished by its label
  - A note with no visibility value renders as internal
  - The toggle renders only when `canSetVisibility` is true, and the component infers the permission nowhere
  - The add-note form carries the choice, defaulting to internal, and both write paths use one store action
- [ ] Implement
- [ ] Test

### Task 2: The filter chip on the feed
- **spec_ref**: `openspec/changes/timeline-visibility-controls/specs/notes-mentions-autocomplete/spec.md#requirement-the-feed-filters-on-visibility-and-says-when-it-cannot`
- **files**: `src/integrations/builtin/activity/CnActivityTab.vue`, `src/integrations/builtin/activity/CnActivityCard.vue`, `src/integrations/builtin/activity/__tests__/CnActivityTab.spec.js`
- **acceptance_criteria**:
  - The feed offers all, internal and public, sending `visibility` on the fetch
  - A caller served the public view sees the filter fixed at public with the reason
  - Each row carries its chip, alongside the existing type, actor and date filters
  - The filter joins the existing filter row without changing the others
- [ ] Implement
- [ ] Test

### Task 3: Docs, translations and the handover
- **spec_ref**: `openspec/changes/timeline-visibility-controls/specs/notes-mentions-autocomplete/spec.md#requirement-a-note-shows-and-sets-whether-it-is-internal-or-public`
- **files**: `docs/components/cn-notes-card.md`, `docs/components/_generated/CnNotesCard.md`, `src/l10n/`
- **acceptance_criteria**:
  - JSDoc and the reference docs define `canSetVisibility` as the answer the server gives for `update` on the object
  - Dutch and English strings ship for the chip, the toggle and the filter
  - dossiq and portaliq are told the prop names and where the value comes from
  - `npm test` and `npm run build` pass
- [ ] Implement
- [ ] Test
