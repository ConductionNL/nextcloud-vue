# Tasks: dashboard-notifications-badge

### Task 1: The header counts the user's unread notifications of the app
- **spec_ref**: `openspec/changes/dashboard-notifications-badge/specs/dashboard-page/spec.md#requirement-a-dashboard-header-counts-the-users-unread-notifications-of-the-app`
- **files**: `src/components/CnNotificationsBadge/CnNotificationsBadge.vue`, `src/utils/appNotifications.js`, `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/schemas/app-manifest-v2.schema.json`, `l10n/en.json`, `l10n/nl.json`, docs
- [x] Implement: badge with count and list, `notificationsBadge` prop and manifest key (2.203.0), read again on page refresh
- [x] Test: `tests/components/CnNotificationsBadge.spec.js`, `tests/schemas/app-manifest-v2.schema.spec.js`

### Task 2: Opening a notification marks it read
- **spec_ref**: `openspec/changes/dashboard-notifications-badge/specs/dashboard-page/spec.md#requirement-opening-a-notification-marks-it-read`
- **files**: `src/components/CnNotificationsBadge/CnNotificationsBadge.vue`
- [x] Implement: dismiss through the OCS API, lower the count, follow the link
- [x] Test: `tests/components/CnNotificationsBadge.spec.js`
