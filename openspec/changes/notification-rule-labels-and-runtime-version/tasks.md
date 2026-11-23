# Tasks: notification-rule-labels-and-runtime-version

## Implementation Tasks

### Task 1: The notification pane shows a label, never the rule key
- **spec_ref**: `openspec/changes/notification-rule-labels-and-runtime-version/specs/notification-preferences/spec.md#requirement-a-notification-rule-reads-as-a-label`
- **files**: `src/utils/notificationRuleLabel.js`, `src/components/CnNotificationPreferences/CnNotificationPreferences.vue`, `src/components/CnAppRoot/CnAppRoot.vue`, `src/index.js`
- [x] Implement
- [x] Test (`tests/components/CnNotificationPreferencesLabels.spec.js`, `tests/components/CnAppRootNotificationLabels.spec.js`, `tests/utils/notificationRuleLabel.spec.js`)

### Task 2: The settings footer can show the installed version
- **spec_ref**: `openspec/changes/notification-rule-labels-and-runtime-version/specs/notification-preferences/spec.md#requirement-the-settings-footer-shows-the-installed-version`
- **files**: `webpack/index.js`, `webpack/index.d.ts`
- [x] Implement
- [x] Test (`tests/tooling/webpackAppVersion.spec.js`)
