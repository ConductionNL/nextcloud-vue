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
- [ ] Implement
- [ ] Test

### Task 2: Three levels, and where a value came from
- **spec_ref**: `openspec/changes/notification-preferences-ui/specs/notification-preferences/spec.md#requirement-the-screen-says-where-each-value-came-from`
- **files**: `src/components/CnNotificationPreferences/CnNotificationPreferences.vue`, `src/stores/notificationPreferences.js`, `src/stores/__tests__/notificationPreferences.spec.js`
- **acceptance_criteria**:
  - App default, group value and personal value resolve in that order, narrowest set value winning
  - Each cell states which level its current value came from
  - A cell the user has not set says it follows the group or the default
  - The store reads and writes through OpenRegister and keeps no copy beyond the page
- [ ] Implement
- [ ] Test

### Task 3: Scope per row, and the admin screen
- **spec_ref**: `openspec/changes/notification-preferences-ui/specs/notification-preferences/spec.md#requirement-a-preference-is-set-for-one-case-domain-or-record-type`
- **files**: `src/components/CnNotificationPreferences/CnNotificationPreferences.vue`, `src/components/CnSettingsSection/`, `src/components/__tests__/CnNotificationPreferencesScope.spec.js`
- **acceptance_criteria**:
  - A row is set globally or per case domain or record type, with scoped rows indented under the global one
  - The narrower setting wins, and a scope is added from the row itself
  - The same component in admin settings writes the group's defaults, and says a user's own value wins
  - Preferences for events no longer in the catalogue are not listed and are pruned on write
- [ ] Implement
- [ ] Test

### Task 4: The digest, the test send and the docs
- **spec_ref**: `openspec/changes/notification-preferences-ui/specs/notification-preferences/spec.md#requirement-mail-is-batched-into-a-digest-a-person-chooses`
- **files**: `src/components/CnNotificationPreferences/CnNotificationPreferences.vue`, `docs/components/cn-notification-preferences.md`, `src/l10n/`
- **acceptance_criteria**:
  - The digest is off, daily or weekly with a time of day, set per channel
  - Events the app marks immediate are never held, and the screen names them
  - A test send per channel delivers to the person on the screen and reports the result
  - JSDoc, the reference doc, and Dutch and English strings ship; `npm test` and `npm run build` pass
- [ ] Implement
- [ ] Test
