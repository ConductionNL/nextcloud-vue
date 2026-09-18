# Tasks: board-card-role-and-keyboard

> The board card stops being a nameless control (ADR-032 `kind: code`).
> Checkbox budget: 4 tasks x 2 = 8 unindented `- [ ]` lines (cap 20).
>
> Nothing here is implemented. This change was written during the 2026-09-18
> quality sweep to argue the fix, not to make it.

## Implementation tasks

### Task 1: The card container stops being a control
- **spec_ref**: `openspec/changes/board-card-role-and-keyboard/specs/index-page/spec.md#requirement-a-board-card-is-a-container-and-its-actions-are-controls`
- **files**: `src/components/CnBoardView/CnBoardView.vue` (its scoped `<style>` block included)
- **acceptance_criteria**:
  - The card `<article>` keeps `:draggable`, `@dragstart` and its
    `data-testid="cn-board-card"`, and loses `tabindex`, `@click`,
    `@keydown.enter` and `aria-label`
  - The cards in a column sit in a nested list, so each card is a `listitem`
    and the number of cards is announced
  - The column `<section>` keeps its own `role="listitem"` in the columns list
  - No prop, event or slot changes
- [ ] Implement
- [ ] Test

### Task 2: Opening a card is a native button
- **spec_ref**: `openspec/changes/board-card-role-and-keyboard/specs/index-page/spec.md#requirement-a-board-card-is-a-container-and-its-actions-are-controls`
- **files**: `src/components/CnBoardView/CnBoardView.vue` (its scoped `<style>` block included), `tests/components/CnBoardView.spec.js`
- **acceptance_criteria**:
  - The card's opening action is a `<button type="button">` carrying
    `cardLabel(card, column)` as its accessible name, with its own test id
  - Enter and Space both emit `card-click` with the same payload as today
  - The Move to `<select>` is a sibling of that button, never a descendant of it
  - The button shows a visible focus ring from Nextcloud CSS variables
- [ ] Implement
- [ ] Test

### Task 3: The board gets an accessibility spec
- **spec_ref**: `openspec/changes/board-card-role-and-keyboard/specs/index-page/spec.md#requirement-the-board-carries-an-accessibility-spec-of-its-own`
- **files**: `tests/a11y/CnBoardView.a11y.spec.js`
- **acceptance_criteria**:
  - A board with two columns and cards in each passes axe with no violations
  - The spec asserts the card has no focusable ancestor of its own button
  - `npm run check:a11y` reports 10 suites where it reports 9 today
  - The spec fails if the button's accessible name is removed, proving it can
    fail
- [ ] Implement
- [ ] Test

### Task 4: Confirm the gate and the legs
- **spec_ref**: `openspec/changes/board-card-role-and-keyboard/specs/index-page/spec.md#requirement-a-board-card-is-a-container-and-its-actions-are-controls`
- **files**: none, this is verification
- **acceptance_criteria**:
  - The hydra gates, `--scope-to-diff --base origin/development`, report gate 32
    `semantic-controls` PASS where they reported 1 finding
  - `npm test`, `npm run check:a11y`, `npm run check:smoke` and
    `npm run check:jsdoc` stay green
  - `npm run lint` and `npm run stylelint` stay at 0 errors
- [ ] Implement
- [ ] Test
