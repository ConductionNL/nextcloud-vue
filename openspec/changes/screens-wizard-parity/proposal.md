---
kind: code
---

# Proposal: screens-wizard-parity

## Summary

The screens draw a wizard as a 720px dialog with an eyebrow "<context>,
step N of M", an inline row of numbered 28px circles with the label beside
each circle, a green check on every finished step, a connector line, and a
footer of Cancel, Back and the primary (Next or the finishing verb). A
full-page form with steps ends in a hairline footer inside its card:
Cancel or Previous left, the primary right, with chevrons on the step
buttons.

What we draw today differs:

- CnWizardDialog uses `NcDialog size="large"` (900px), stacks the label
  under a 34px circle, fills finished steps with the primary colour, draws
  the check as a text glyph, has no eyebrow, and marks the stepper up as a
  `tablist` with `tab` items.
- CnFormPage draws its steps as plain text with a "✓" glyph, puts Back,
  Next and Submit together on the left, has no Cancel, no hairline and no
  card.

This change adds the board stepper and footer as part of the board look
(`cnLook`, introduced by `screens-dialog-parity`). CnSetupWizard renders
through CnWizardDialog and follows without changes of its own.

1. The board stepper: 28px circles, label inline, three states (done with a
   green check icon, current filled primary with its number, upcoming with
   a 2px outline), a 2px connector coloured by state.
2. The stepper is an ordered list with `aria-current="step"`, in both looks.
3. The wizard eyebrow reads "<context>, step N of M" and updates per step.
4. The wizard footer: Cancel (secondary), Back (secondary, chevron left),
   the primary (Next with chevron right, or the finishing verb with its own
   icon). Width 720.
5. CnFormPage with steps uses the same stepper, and ends in a hairline
   footer inside a white card: Cancel or Previous left, the primary right.

## Reference screens

- `pipelinq/PqNieuwsbriefWizard` (six steps, finishing verb):
  https://identity.conduction.nl/screens/board?id=pipelinq/PqNieuwsbriefWizard
- `buildiq/BqDataImporteren` (step 3 of 5, the three circle states):
  https://identity.conduction.nl/screens/board?id=buildiq/BqDataImporteren
- `pipelinq/PqInstellen` (setup wizard, CnSetupWizard):
  https://identity.conduction.nl/screens/board?id=pipelinq/PqInstellen
- `opencatalogi/OcInstallatie` (setup wizard):
  https://identity.conduction.nl/screens/board?id=opencatalogi/OcInstallatie
- `buildiq/BqNieuweApp` (step 1 of 4):
  https://identity.conduction.nl/screens/board?id=buildiq/BqNieuweApp

Canon: section 6 of `UNIFORM-canon.md`.

## Builds on

- `openspec/changes/cn-wizard-dialog` (the component, its steps API and
  slots) and `openspec/specs/cn-setup-wizard` (REQ-SETUP-NV-010..013).
- `openspec/specs/manifest-form-logic` and the form page type
  (`manifest-form-page-type`) for CnFormPage's steps.
- `screens-dialog-parity` (this PR): `cnLook`, the `wizard` width, the
  eyebrow and the dialog frame.
- `wizard-summary-skips-empty-fields`, `optional-step-requires`: unchanged.

## Affected consumers

Every app with a setup wizard (CnSetupWizard is in all five), pipelinq and
buildiq wizards, and every manifest `form` page with `steps`.

## Backward compatibility

Additive behind `cnLook`. One change applies in both looks: the stepper's
roles move from `tablist`/`tab` to an ordered list with `aria-current`. The
old roles were wrong (a stepper is not a set of tabs, and the items were
not focusable tabs), so this is a fix; e2e tests that query `role="tab"`
inside a wizard need the new selector.

## Theming

Nextcloud variables only: done uses `--color-success` (the board's
#1e6b2a), current uses `--color-primary-element`, upcoming uses
`--color-border-dark`.
