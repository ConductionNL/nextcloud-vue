## Summary

Let a schema property carry an explanation (`x-help`) that every form field opens in place through a toggletip, keyboard and screen reader operable, and still there when the field shows an error.

- Rows: 13.18 "Each field on the officer form carries an explanation the officer can open in place" (not statutory).
- Wave: 1.
- Depends on: nothing. Consuming apps pick the change up on `^2` once a `2.x` minor is released.
- Decision: no Ruben decision governs this row. The release is a minor; a major needs Ruben's permission.

Build rules: openspec/woo-build-rules.md (its PHP checks do not apply to this JavaScript library; the npm checks in tasks.md do)

## Why

Woo capability row 13.18, "Each field on the officer form carries an
explanation the officer can open in place". Our column reads `partial`: "a
schema property's description renders as help text on a nextcloud-vue form,
so a field can carry an explanation; nothing opens one in place as a
deliberate affordance". The gap register names the missing half: "A help
affordance (toggletip or info button) on form fields that opens the schema
property's long explanation in place, keyboard and screen reader operable."
Build plan: new spec, wave 1, size M. No Ruben decision governs it.

What `development` has today, read at d0a53a5a: `CnFieldHelper` renders the
helper line under a field and, only when `fieldsFromSchema()` had to cut a
long description (`splitDescription()`, `src/utils/schema.js:512`), an
information button that opens the full text in an `NcPopover`. So an
explanation appears in place by accident of length, never because a schema
author wrote one, and the button disappears whenever the field shows an
error, which is when the officer needs it most.

## What Changes

- A schema property may carry `x-help`: an explanation, separate from its
  short `description`. A string, or a map of language codes to strings, read
  in the user's language with the same fallback as the rest of the schema's
  labels.
- `fieldsFromSchema()` emits `help` on every field ('' when absent), beside
  `description` and `descriptionLong`. Nothing existing is removed or renamed.
- `CnFieldHelper` gains an optional `help` prop and renders a toggletip button
  whenever `help` or `more` is present: named "About {label}", `aria-expanded`,
  opened and closed by Enter, Space and click, closed by Escape with focus
  back on the button, its text announced through a polite live region. It
  stays available while the field shows an error.
- `CnFormDialog`, `CnAdvancedFormDialog` and every surface that renders
  `CnFieldHelper` pass `help` through. A field without `x-help` and with a
  short description renders exactly as today.

## Consuming apps

The change reaches every app that renders a form through the library:
`CnFormDialog`, `CnAdvancedFormDialog`, `CnIndexPage`'s create and edit
dialogs, or `CnFieldHelper` directly. Measured in the workspace checkouts,
which may lag `development`: openregister, opencatalogi, integriq, filinq,
stackiq, larpinq, launchpad, dossiq, pipelinq, shillinq, learniq, portaliq,
decidiq, buildiq, keepiq, hermiq, humaniq and planninq all depend on
`@conduction/nextcloud-vue` `^2` and mount `CnAppRoot`. Each picks the change
up on its next `^2` update and gets help where a schema carries `x-help`;
nothing changes for a field without it. zaakafhandelapp is out of scope for
fleet sweeps.

## Not a breaking change

Additive only: a new optional schema keyword, a new field key, a new optional
prop. No prop, slot, event, class or export is removed or renamed, and the
legacy `cn-form-dialog__helper` class stays. The release is a minor on the
`2.x` line through a `feat:` commit. A `BREAKING CHANGE:` footer, a `!` in the
commit type, or a major version is not allowed (Ruben, 2026-09-19: a major
needs his explicit permission).

## Fail closed

- An `x-help` value that is not a string or a language map is ignored and the
  field renders as today, with one console warning naming the property. It
  never breaks the form.
- Help text is rendered as text, never as HTML.

## App absent

A consuming app that stays on an older `^2` release renders as today. An app
whose schemas carry no `x-help` sees no change. OpenRegister stores `x-help`
as any other schema keyword; no OpenRegister change is needed for it to
reach the form.

## Dependencies and wave

None. Wave 1.

## Done

Merged on `development` with CI green and released as a `2.x` minor. Row 13.18
is `production` once a consuming app ships a store release on that version
with at least one officer form whose schema carries `x-help`.
