# Tasks: journey-repeating-item-review

> Sibling half of buildiq `forms-multi-product-request` (REQ-BQMP-003).
> Row `form-multi-product-request` (buildiq). `kind: code`. Builds on
> `journey-runtime`, task 3 (the review step).
> Checkbox budget: 3 tasks x 2 = 6 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: `CnJourneyReviewList`
- **spec_ref**: `openspec/changes/journey-repeating-item-review/specs/journey-runtime/spec.md#requirement-the-review-lists-a-list-answer-item-by-item`
- **files**: `src/components/CnJourney/CnJourneyReviewList.vue`, `src/components/CnJourney/__tests__/CnJourneyReviewList.spec.js`
- **acceptance_criteria**:
  - An array of objects renders as a counted ordered list with a heading per item (option label when present) and labelled details; an empty list says "Nothing chosen."
  - Change emits the item's index for the host to focus
  - Verify: jest
- [x] Implement
- [x] Test

### Task 2: Targets from the repeating write
- **spec_ref**: `openspec/changes/journey-repeating-item-review/specs/journey-runtime/spec.md#requirement-the-review-says-what-each-item-will-be-filed-as`
- **files**: `src/components/CnJourney/CnJourney.vue`, `src/components/CnJourney/__tests__/CnJourneyReviewTargets.spec.js`
- **acceptance_criteria**:
  - A later write with `forEach`, `targetBy` and `targets` adds the sentence and "Filed as" per item; without it no target text shows
  - An unmapped value marks its item and disables Submit with the reason
  - Verify: jest with journey fixtures; mutation check: ignoring `forEach` and matching any write reddens the no-write test
- [ ] Implement — partial: the targets logic is built (`findRepeatingWrite`, `journeyItemTargets`, the sentence, "Filed as", the unmapped mark and the `unfileable` event on `CnJourneyReviewList`); wiring it into `CnJourney.vue` is not run: needs `journey-runtime` (CnJourney is not built)
- [ ] Test — the logic is tested in `tests/components/CnJourneyReviewList.spec.js`; the CnJourney end of it is not run: needs `journey-runtime`

### Task 3: Return to the item, accessibility and an end-to-end run
- **spec_ref**: `openspec/changes/journey-repeating-item-review/specs/journey-runtime/spec.md#requirement-the-review-lists-a-list-answer-item-by-item`
- **files**: `src/components/CnJourney/CnJourney.vue`, `tests/a11y/CnJourneyReviewList.a11y.spec.js`, `e2e/journey-item-review.e2e.js`, `docs/components/cn-journey.md`
- **acceptance_criteria**:
  - Change returns to the list step with values kept and focus on the item's row
  - A harness journey with two products shows both blocks with their type values
  - Verify: `npm run check:a11y`; `npm run test:e2e -- journey-item-review`; `npm run check:docs`
- [ ] Implement — not run: needs `journey-runtime` (CnJourney is not built); the list emits `change` with the item index for it
- [ ] Test — not run: needs `journey-runtime`, a browser for the a11y and e2e runs
