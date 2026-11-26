# Proposal: dashboard-notifications-badge

## Why

pipelinq's My work (requirement REQ-MW-140) must show a header badge with the user's unread Pipelinq notifications,
open their list (type icon, summary, relative time, link), mark one read when it is opened, and show no badge at 0. My
work is a manifest dashboard page, and no library surface reads Nextcloud notifications.

## What changes

- `CnNotificationsBadge`: reads the notifications OCS API, keeps one app's entries, shows their count in a button that
  opens their list; opening one dismisses it (the notifications app's "read"), lowers the count and follows its link.
  Nothing at 0 or without the notifications app. Reads again on `cn:page:refresh`.
- `CnDashboardPage` `notificationsBadge` (manifest `config.notificationsBadge`, schema 2.203.0): `true` for the page's
  app, or an app id. Loaded only on a page that asks for it.
