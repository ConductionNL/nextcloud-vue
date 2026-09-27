---
kind: code
---

## Why

`CnStorePage` decides on its own who sees Install: `getCurrentUser().isAdmin`. It has no
Publish action at all. Learniq decided (D27, 27 September) that any teacher installs a
shared course as a copy, and that publishing is limited to a group in learniq's own
permission matrix, by default the team leads. Learniq's server already answers those
questions per user, but the shared page cannot be told the answer, so a teacher who may
install never sees the button.

The page must not learn learniq's groups. The consuming app resolves the answer; the page
only renders it.

## What Changes

- `CnStorePage` gains three optional props:
  - `canInstall` (Boolean or null): who sees Install. `null` (the default) keeps today's
    rule, administrators only.
  - `canPublish` (Boolean or null): who sees Publish. `null` falls back to the same
    administrator rule.
  - `publishRoute` (route name or route location): where Publish takes the user. With no
    route there is no Publish button, whatever `canPublish` says, so an app that never set
    it renders exactly what it renders today.
- The Publish button sits in the page header and navigates to the app's own publish
  surface. Publishing stays app-owned, like install (ADR-080 Decision 3): what a publish
  sends, and the checks before it, differ per app.
- Both props hide a button only. The component docs say so: the app's server must enforce
  the same rule, as learniq's `StoreController` does through its action matrix.
- No breaking change. Every existing consumer (dossiq, decidiq, shillinq, openbuild,
  integriq and the other `type: "store"` pages) passes none of the new props and keeps
  admin-only Install and no Publish.

## Capabilities

### New Capabilities

- `store-page`: the `type: "store"` page component. This change specifies who sees its
  Install and Publish actions and where Publish leads.

### Modified Capabilities

(none)

## Impact

- `src/components/CnStorePage/CnStorePage.vue`: three props, one header button, the
  `canInstall` computed renamed to `showInstall` (it was not public API).
- `tests/components/CnStorePage.spec.js`: the visibility matrix, the admin default, the
  missing-route case and the navigation.
- `docs/components/_generated/CnStorePage.md` (generated) and a short usage section in
  the component's docs page.
- `l10n/nl.json`: the Dutch value for the new Publish label.
- Consumer: learniq passes `canInstall`, `canPublish` and `publishRoute` from its own
  initial state once a release carries this change. Until then learniq keeps the admin
  default. No other app changes.
- Theming: the button is an `NcButton`, so it follows Nextcloud and NL Design variables.
  No new CSS colours.
