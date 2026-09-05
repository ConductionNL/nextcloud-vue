# Tasks: setup-choice-cards

> Card renderer, live option source, schema, docs (ADR-032 `kind: code`).
> Checkbox budget: 4 tasks × 2 = 8 unindented `- [ ]` lines (cap 20).

## Implementation Tasks

### Task 1: CnChoiceCards
- **spec_ref**: `openspec/changes/setup-choice-cards/specs/setup-choice-cards/spec.md#requirement-a-card-grid-is-operable-without-a-mouse-or-colour-vision`
- **files**: `src/components/CnChoiceCards/CnChoiceCards.vue`, `src/components/CnChoiceCards/index.js`, `tests/components/CnChoiceCards.spec.js`
- **acceptance_criteria**:
  - Each option is a `<label>` around a visible native input, radio or checkbox
  - Two grids on one page do not share a radio selection
  - Option titles render as spans, so a grid adds no headings
  - Values are matched as strings, so a server round trip cannot lose a selection
- [x] Implement
- [x] Test

### Task 2: The wizard renders cards and reads live options
- **spec_ref**: `openspec/changes/setup-choice-cards/specs/setup-choice-cards/spec.md#requirement-a-choice-step-can-read-its-options-from-the-server`
- **files**: `src/components/CnSetupWizard/CnSetupWizard.vue`, `tests/components/CnSetupWizard.spec.js`
- **acceptance_criteria**:
  - `display: "cards"` renders the grid; its absence still renders `NcSelect`
  - `optionsSource` reads the named key from the setup status document
  - A wizard with no `optionsSource` makes no status request
  - A `multiple` card step posts an array
  - The summary recaps the label, not the stored id
- [x] Implement
- [x] Test

### Task 3: Manifest schema 2.33.0
- **spec_ref**: `openspec/changes/setup-choice-cards/specs/setup-choice-cards/spec.md#requirement-a-choice-step-renders-as-cards-when-it-asks-to`
- **files**: `src/schemas/app-manifest-v2.schema.json`, `tests/schemas/app-manifest-v2.schema.spec.js`
- **acceptance_criteria**:
  - `display` accepts `select` and `cards` and rejects anything else
  - `optionsSource` documents that it names a key in the setup status document
  - The vendored copy in `ConductionNL/.github` is synced, or gate 22 rejects the first app that uses it
- [x] Implement
- [x] Test

### Task 4: Docs and the CnCard title tag
- **spec_ref**: `openspec/changes/setup-choice-cards/specs/setup-choice-cards/spec.md#requirement-a-card-grid-is-operable-without-a-mouse-or-colour-vision`
- **files**: `src/components/CnCard/CnCard.vue`, `docs/components/cn-choice-cards.md`, `docs/components/cn-card.md`, `src/components/CnChoiceCards/CnChoiceCards.md`
- **acceptance_criteria**:
  - `titleTag` defaults to `h2`, so every existing card is unchanged
  - `check:docs` passes with the new component and prop documented
- [x] Implement
- [x] Test
