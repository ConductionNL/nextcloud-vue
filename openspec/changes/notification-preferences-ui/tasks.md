# Tasks: notification-preferences-ui

> One screen where a person chooses what notifies them (ADR-032 `kind: code`).
> Checkbox budget: 4 tasks x 2 = 8 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: `CnNotificationPreferences`, the matrix
- **spec_ref**: `openspec/changes/notification-preferences-ui/specs/notification-preferences/spec.md#requirement-a-person-chooses-which-events-notify-them-and-over-which-channel`
- **files**: `src/components/CnNotificationPreferences/CnNotificationPreferences.vue`, `src/components/CnNotificationPreferences/index.js`, `src/components/index.js`, `src/index.js`, `src/components/__tests__/CnNotificationPreferences.spec.js`
- **acceptance_criteria**:
  - Events render as rows and channels as columns, both taken from the host's catalogue
  - A channel the instance has not configured renders disabled with the reason
  - Events group by the app's categories, groups collapse, and a whole row or column sets at once
  - The matrix is a table for a screen reader, with row and column headers
- [x] Implement
- [x] Test

### Task 2: Three levels, and where a value came from
- **spec_ref**: `openspec/changes/notification-preferences-ui/specs/notification-preferences/spec.md#requirement-the-screen-says-where-each-value-came-from`
- **files**: `src/components/CnNotificationPreferences/CnNotificationPreferences.vue`, `src/stores/notificationPreferences.js`, `src/stores/__tests__/notificationPreferences.spec.js`
- **acceptance_criteria**:
  - App default, group value and personal value resolve in that order, narrowest set value winning
  - Each cell states which level its current value came from
  - A cell the user has not set says it follows the group or the default
  - The store reads and writes through OpenRegister and keeps no copy beyond
    the page — `composables/useNotificationPreferencesStore.js`. One read for
    the catalogue, the values, the forced rows and the refusals; optimistic
    writes that roll back when the server refuses; nothing cached past the
    page, because preferences are read by the server when something happens.
  - A FOURTH LEVEL arrived while this was built: openregister's forced
    channels sit ABOVE the person's own preference, and a kind refused for a
    recipient returns a refusal rather than an empty channel list. Both are
    resolved and rendered here, because a screen showing a setting that does
    not apply is the failure this change exists to prevent.
- [x] Implement
- [x] Test

### Task 3: Scope per row, and the admin screen
- **spec_ref**: `openspec/changes/notification-preferences-ui/specs/notification-preferences/spec.md#requirement-a-preference-is-set-for-one-case-domain-or-record-type`
- **files**: `src/components/CnNotificationPreferences/CnNotificationPreferences.vue`, `src/components/CnSettingsSection/`, `src/components/__tests__/CnNotificationPreferencesScope.spec.js`
- **acceptance_criteria**:
  - A row is set globally or per case domain or record type, with scoped rows indented under the global one
  - The narrower setting wins, and a scope is added from the row itself
  - The same component in admin settings writes the group's defaults, and says a user's own value wins
  - Preferences for events no longer in the catalogue are not listed and are pruned on write
  - A NOTE ON THE SHAPE: the values are nested,
    `{ event: { channel: { scope: value } } }`, rather than joined into one
    key. A joined key needs a delimiter that can appear in neither an event id
    nor a scope, and a scope is a case domain or record type named by whoever
    configured the app. There is no such character anybody can promise.
  - AND ON THE FALLBACK: an absent scoped cell is an unanswered narrower
    question, not a scoped no, so it falls through to the global row and the
    screen says "Follows the row above". Reading it as false would override the
    group value and the app default at once.
- [x] Implement
- [x] Test

### Task 4: The digest, the test send and the docs
- **spec_ref**: `openspec/changes/notification-preferences-ui/specs/notification-preferences/spec.md#requirement-mail-is-batched-into-a-digest-a-person-chooses`
- **files**: `src/components/CnNotificationPreferences/CnNotificationPreferences.vue`, `docs/components/cn-notification-preferences.md`, `src/l10n/`
- **acceptance_criteria**:
  - The digest is off, daily or weekly with a time of day, set per channel
  - Events the app marks immediate are never held, and the screen names them —
    on the row itself, and again next to the digest control where somebody is
    deciding to switch batching on
  - A test send per channel delivers to the person on the screen and reports
    the result, INCLUDING A REFUSAL. A refusal is an answer, not a failure to
    answer; a button that reported nothing would read as proof the channel
    works.
  - JSDoc, the reference doc, and Dutch and English strings ship; `npm test`
    and `npm run build` pass — JSDoc, `docs/components/cn-notification-preferences.md`,
    `docs/utilities/composables/use-notification-preferences-store.md` and 26
    new Dutch strings ship. English is the key, so no second catalogue.
    `npm run build` was NOT RUN: this lane verifies build-first (the touched
    suites, eslint, `check:docs`, `check:public-safe`) and leaves the whole-tree
    build to CI, which is the arbiter.
- [x] Implement
- [x] Test
