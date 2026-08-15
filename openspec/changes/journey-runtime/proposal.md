---
kind: code
---

# Proposal: journey-runtime

## Summary

Add `CnJourney` (in-page) and `CnJourneyDialog` (modal) — the one renderer for
an OpenRegister `journey`. Composes `CnFormPage` per form step; adds progress
display, two-level step groups, branch evaluation, the review step, submit,
and resume. Route-split so a page that does not render a journey does not pay
for it.

Chain link 8 of `hydra/openspec/changes/portaliq-phase-two`. Implements the
renderer half of ADR-085.

## Motivation

`tilburg-woo-ui` has seven wizards, ~13,640 lines, each with its own step
index, per-index validation chain and progress-status functions. Its shared
`con-stepper` got the model right — flavoured step definitions, two-level
`substeps`, per-step `condition` predicates, navigable and non-navigable
groups — but it is JavaScript inside one app's bundle, invisible to the rest of
the fleet.

The field-level half already exists in the library: `CnFormPage` renders
`config.steps[]`, `$defs.visibleWhen` and `$defs.fieldValidation` with
documented per-type semantics. What is missing is everything above one form:
the sequence, the branch, the review, the submit, and the resume.

Three hosts need it — Portaliq in-page, nc-vue in a modal, OpenBuild in-page
and in its designer — and they must not each build their own.

## Affected Projects

- [ ] `nextcloud-vue` — `CnJourney`, `CnJourneyDialog`, a journey store talking
      to OpenRegister's run API, and a `CnProcessSteps` progress indicator
      emitting NL Design markup.

## Design notes

**Compose, do not re-implement.** A form step mounts `CnFormPage` with that
form's config. Field rendering, validation and conditional visibility stay
exactly where they are.

**The step model comes from `con-stepper`**, which had it right: two levels,
conditional steps, and groups that display without being navigable.

**Branch evaluation uses `$defs.visibleWhen`.** No second condition grammar —
this is the single most likely way the design rots, so the renderer has no code
path that could introduce one.

**The progress indicator becomes a library component.** Tilburg gets it from
`@gemeente-denhaag/process-steps`, a React package. Its CSS-only equivalent
does not exist, so it is absorbed into nc-vue emitting NL Design markup
(ADR-072) rather than pulling a React library into a Vue portal.

## Risks

- **Weight.** `CnJourney` is substantial and the portal is a public, mobile,
  first-visit surface. It must be route-split, and the split verified on
  transferred bytes rather than on the build's own emitted-size report.
- **Three hosts, one renderer, is an invariant that decays quietly.** A host
  that adds "just one" step type breaks portability without breaking anything
  visible. It is gated.
- **Resume in a modal is a different lifecycle from resume in a page.** The
  dialog must not lose staged answers when it closes, or "save and continue
  later" becomes a data-loss bug rather than a feature.
- The library gains a store that writes. Every existing nc-vue store is
  read-mostly; a renderer that can create objects deserves its own review.
