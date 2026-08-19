# Tasks: journey-runtime

> The one journey renderer, in-page and modal (ADR-032 `kind: code`).
> Checkbox budget: 5 tasks × 2 = 10 unindented `- [ ]` lines (cap 20).

## Implementation Tasks

### Task 1: CnJourney — steps, groups, conditions
- **spec_ref**: `openspec/changes/journey-runtime/specs/journey-runtime/spec.md#requirement-steps-must-support-two-levels-conditions-and-non-navigable-groups`
- **files**: `src/components/CnJourney/CnJourney.vue`, `src/components/CnJourney/__tests__/CnJourney.spec.js`
- **acceptance_criteria**:
  - Each `form` step mounts `CnFormPage` with that form's config; field rendering, `visibleWhen` and `fieldValidation` are NOT re-implemented — asserted by comparing a standalone render against the in-journey render
  - Two-level groups, conditional steps and non-navigable groups behave as `con-stepper` defined them; a false condition removes the step AND renumbers contiguously
  - A third nesting level is reported as an error rather than rendered
- [ ] Implement
- [ ] Test

### Task 2: Branching through the shared predicate only
- **spec_ref**: `openspec/changes/journey-runtime/specs/journey-runtime/spec.md#requirement-branching-must-evaluate-only-the-shared-visiblewhen-predicate`
- **files**: `src/components/CnJourney/useJourneyBranching.js`, `src/components/CnJourney/__tests__/branching.spec.js`
- **acceptance_criteria**:
  - Rules evaluate through the EXISTING `visibleWhen` evaluator; the module contains no second condition implementation — asserted by a test that stubs the shared evaluator and observes every branch decision route through it
  - An erroring rule evaluates false, the default step renders, and the failure is reported to the run
  - Local, endpoint and source modes are each covered
- [ ] Implement
- [ ] Test

### Task 3: Review, submit and resume
- **spec_ref**: `openspec/changes/journey-runtime/specs/journey-runtime/spec.md#requirement-a-journey-must-be-resumable-in-both-hosts-without-losing-answers`
- **files**: `src/components/CnJourneyDialog/CnJourneyDialog.vue`, `src/stores/journeyRun.js`, `src/stores/__tests__/journeyRun.spec.js`
- **acceptance_criteria**:
  - The review step shows answers from every preceding step, grouped by step, and a correction returns to the originating step with values intact
  - Answers persist as steps complete; closing `CnJourneyDialog` does NOT discard staged answers — this is the difference between "save and continue later" and a data-loss bug
  - A run started in the modal resumes in the page at the same step with the same answers
  - The store is the only writer; components do not call the run API directly
- [ ] Implement
- [ ] Test

### Task 4: CnProcessSteps — NL Design progress indicator
- **spec_ref**: `openspec/changes/journey-runtime/specs/journey-runtime/spec.md#requirement-the-progress-indicator-must-be-a-library-component-emitting-nl-design-markup`
- **files**: `src/components/CnProcessSteps/CnProcessSteps.vue`, `src/components/CnProcessSteps/__tests__/CnProcessSteps.spec.js`
- **acceptance_criteria**:
  - Emits NL Design component classes; token values resolve from the active theme — asserted on the RENDERED markup, not on the presence of a token package
  - No React design-system package is added; this replaces `@gemeente-denhaag/process-steps` for Vue consumers (ADR-072 absorption)
  - Current / completed / upcoming steps are distinguishable to assistive technology without relying on colour
- [ ] Implement
- [ ] Test

### Task 5: Route-splitting and the host-vocabulary gate
- **spec_ref**: `openspec/changes/journey-runtime/specs/journey-runtime/spec.md#requirement-the-journey-renderer-must-be-route-split`
- **files**: `src/index.js`, `scripts/gates/journey-vocabulary.mjs`, `tests/integration/journeyChunk.spec.js`
- **acceptance_criteria**:
  - A page rendering no journey does not transfer the journey chunk — measured on TRANSFERRED bytes, not the build's emitted-size report
  - The gate fails on a host registering a step type, field type, validation rule or branch operator, naming the host and the addition
  - The gate's negative fixture runs in CI, so a clean run is evidence rather than silence
- [ ] Implement
- [ ] Test
