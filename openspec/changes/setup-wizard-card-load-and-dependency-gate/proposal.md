---
kind: code
---

# Proposal: setup-wizard-card-load-and-dependency-gate

## Summary

Three changes to the first-time setup wizard, from Ruben's pipelinq review of
2026-10-06 (items A1, A2 and A3):

- A dataset card loads itself. A `choice` step with `display: "cards"` may
  declare `loadAction`. Every card except "None" then gets its own Load button.
- The wizard checks the app's dependencies before it shows any step. A missing
  required app replaces the steps, and Next stays disabled until it is there.
  A step can declare `requires: [appId]` and is skipped when that app is absent.
- `CnAdminActionCard` gives the admin screen a place for a one-click server
  action, such as repairing the register. Provisioning never belongs in the
  wizard.

## Motivation

Sixteen apps ask which example dataset to load, then load it on a separate
`run-action` step. The admin picks a card, clicks Next, and only then sees what
happens. When the load fails, the error lands one step away from the card that
caused it. Ruben asked for the Load button on the card itself, with the spinner
and the result in the same place.

When OpenRegister is missing, the wizard still walks the admin through steps
whose actions cannot succeed. Each one fails with a server error that does not
say "install OpenRegister". The admin should see the missing app first, with
the button that installs it.

Register repair is maintenance, not setup. It ran as a wizard step in several
apps because the admin screen had no ready-made block for "explain, click, see
the result".

## Affected projects

- [ ] `nextcloud-vue`: `CnSetupWizard` (`loadAction`, dependency gate,
      `requires`), `CnChoiceCards` (`#option-actions` slot), `CnWizardDialog`
      (`nextDisabled`), new `CnAdminActionCard`, manifest schema, docs.
- [ ] `pipelinq`: first consumer. Its `demo-data` step gains
      `loadAction: "load-demo-data"` and drops the separate run-action step.
      Fleet rollout follows after review.

## Design notes

**The button sits outside the card's label.** Each card is a `<label>` around
a native radio. A button inside a label is interactive content inside
interactive content, and a click on it would also toggle the radio. The new
`#option-actions` slot renders below the label, in the same grid cell.

**"None" never gets a button.** The option whose value is `none` is the
explicit "seed nothing" answer. Picking it still records the choice on Next,
exactly as before.

**A load also selects its card.** The summary then shows what was loaded, and
Next records the same choice the server already stored.

**Old manifests keep working.** Without `loadAction` the cards render as
before, and a following `run-action` step still runs on entry.

**The dependency gate reuses `CnLeafDependencySettings`.** It already lists
required apps before optional ones, with install and enable buttons for an
admin. The wizard shows it as its only step while a required app is missing.

## Risks

- A manifest step marked `required: true` with `requires` on an absent app
  is skipped by the wizard, but `useSetupStatus` still reports it unmet. Apps
  should not combine the two. The spec says so.
