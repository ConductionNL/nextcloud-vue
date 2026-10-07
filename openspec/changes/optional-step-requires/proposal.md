---
kind: code
---

# Proposal: optional-step-requires

## Summary

A setup step whose `requires` names an absent app is not applicable. The wizard
already skips such a step (#1326, schema 2.45.0). Setup status now agrees: the
step is neither met nor unmet, so it never reopens the wizard and never gates
the app. This holds for optional and required steps alike.

## Motivation

The fleet rollout of `requires` found the gap. `useSetupStatus` ignored
`requires`, so a skipped optional step stayed in `optionalUnmet` for ever.
`CnAppRoot` then reopened the non-gating wizard over every page, offering a
step the wizard would not show. A required step with an absent app was worse:
it gated the whole app behind a wizard with nothing left to do. The docs and
the schema warned against that combination instead of handling it.

## Affected projects

- [ ] `nextcloud-vue`: `useSetupStatus`, `useDependencyCheck`
  (`missingRequiredApps`, `readServerAppStatuses`), `CnSetupWizard`, schema
  2.48.1 description of `requires`, docs and changelog.

## Scope

- One app check for both sides: the `dependency_statuses` initial state first,
  then `useAppStatus`, exactly as the wizard's dependency gate resolves it.
- Each step from `useSetupStatus` carries `applicable` and `missingApps`. A
  new `notApplicable` list names the skipped steps.
- `requiredUnmet`, `optionalUnmet` and `optionalUnmetReported` leave out steps
  that are not applicable. `CnAppRoot`'s gate and its auto-open follow.

## Out of scope

- The server side. An app's `SetupController` may still answer
  `completed: false` for a skipped required step. `CnAppRoot` gates on
  `requiredUnmet`, not on `completed`, so the app is not blocked by it.
