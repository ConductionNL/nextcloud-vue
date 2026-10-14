# Tasks: board-field-label-over-placeholder

### Task 1: Keep the placeholder hidden under an inside label
- **spec_ref**: `openspec/changes/board-field-label-over-placeholder/specs/form-field-board-look/spec.md#requirement-a-field-label-and-its-placeholder-are-never-drawn-over-each-other`
- **files**: `src/css/form-field.css`
- [x] Implement: the placeholder rule under `.cn-look-board`
- [x] Test: e2e `e2e/l11-board-textarea-label.e2e.js` (a computed `::placeholder` style; jsdom has no cascade to test it in)
