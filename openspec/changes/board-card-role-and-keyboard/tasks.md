# Tasks: board-card-role-and-keyboard

> The board card stops being a nameless control (ADR-032 `kind: code`).
> Checkbox budget: 4 tasks x 2 = 8 unindented `- [ ]` lines (cap 20).
>
> Written during the 2026-09-18 quality sweep to argue the fix; built on
> 2026-09-19 once the argument was accepted. Every box below is ticked against
> a file that exists and an assertion that has been made to fail.

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
- [x] Implement
- [x] Test

### Task 2: Opening a card is a native button
- **spec_ref**: `openspec/changes/board-card-role-and-keyboard/specs/index-page/spec.md#requirement-a-board-card-is-a-container-and-its-actions-are-controls`
- **files**: `src/components/CnBoardView/CnBoardView.vue` (its scoped `<style>` block included), `tests/components/CnBoardView.spec.js`
- **acceptance_criteria**:
  - The card's opening action is a `<button type="button">` carrying
    `cardLabel(card, column)` as its accessible name, with its own test id
  - Enter and Space both emit `card-click` with the same payload as today.
    ASSERTED AS THE ELEMENT TYPE, not as a key event: measured, this jsdom
    fires zero clicks from keydown Enter or Space on a native button, so the
    native `button type="button"` IS the guarantee and simulating the key
    would only prove the component hand-rolled what is being removed
  - The Move to `<select>` is a sibling of that button, never a descendant of it
  - The button shows a visible focus ring from Nextcloud CSS variables
- [x] Implement
- [x] Test

### Task 3: The board gets an accessibility spec
- **spec_ref**: `openspec/changes/board-card-role-and-keyboard/specs/index-page/spec.md#requirement-the-board-carries-an-accessibility-spec-of-its-own`
- **files**: `tests/a11y/CnBoardView.a11y.spec.js`
- **acceptance_criteria**:
  - A board with two columns and cards in each passes axe with no violations
  - The spec asserts the card has no focusable ancestor of its own button
  - `npm run check:a11y` reports 10 suites where it reports 9 today
  - The spec fails if the button's accessible name is removed, proving it can
    fail
  - MEASURED: stripping the name reddens 1 test. Taking gate 32's own
    suggestion, `role="button"` on the card, reddens 4 and axe names it
    `nested-interactive` (serious) and `aria-required-children` (critical),
    which is the argument confirmed by a tool with no opinion about it.
- [x] Implement
- [x] Test

### Task 4: Confirm the gate and the legs
- **spec_ref**: `openspec/changes/board-card-role-and-keyboard/specs/index-page/spec.md#requirement-a-board-card-is-a-container-and-its-actions-are-controls`
- **files**: none, this is verification
- **acceptance_criteria**:
  - The hydra gates, `--scope-to-diff --base origin/development`, report gate 32
    `semantic-controls` PASS where they reported 1 finding
  - `npm test`, `npm run check:a11y`, `npm run check:smoke` and
    `npm run check:jsdoc` stay green
  - `npm run lint` and `npm run stylelint` stay at 0 errors
- [x] Implement
- [x] Test
