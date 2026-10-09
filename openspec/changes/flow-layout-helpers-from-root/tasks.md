# Tasks: flow-layout-helpers-from-root

> Library half of stackiq `architecture-assistant-drafted-views` (row `arch-ai-diagram`). `kind: code`.
> Checkbox budget: 1 task x 2 = 2 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: Re-export and guard
- **spec_ref**: `openspec/changes/flow-layout-helpers-from-root/specs/flow-auto-layout/spec.md#requirement-the-flow-layout-helpers-are-exported-from-the-package-root`
- **files**: `src/composables/index.js`, `src/index.js`, `tests/packaging/flow-layout-exports.spec.js`, `docs/composables/` entry for the helpers
- **acceptance_criteria**:
  - The eight names import from the root entry and from the composables barrel
  - Verify: jest; mutation check: removing one re-export reddens the packaging spec; `npm run check:build`, `npm run check:public-safe`, `npm run check:docs`
- [x] Implement
- [x] Test
