---
kind: code
---

# Proposal: notification-quiet-hours-block

## Summary

OpenRegister keeps one delivery window (quiet hours) per user at
`/api/notification-delivery-window`: `GET` answers the stored window or
`{enabled: false}`, `PUT` stores `{enabled, start, end, timezone, days}` or
clears it with `{enabled: false}`, and answers 422 on a bad value. No screen
read or wrote it. Learniq's board `LqMeldingen` draws a "Quiet hours" block in
the notification tab of its settings dialog, and that tab is this library's
`CnNotificationPreferences`.

The new `CnQuietHours` block reads and saves the window. The pane shows it
under the notifications when the app asks for it: CnAppRoot prop `quietHours`
(provided as `cnQuietHours`), or the pane's own `quietHours` prop. It is off by
default, so every app that does not ask looks as before.

## Decision

The window is per user and applies to every app on the instance, so the block
says so under its fields, and the time zone sent is the browser's (without it
OpenRegister falls back to the server's zone, wrong for a user abroad).

## What apps do to adopt

- Pass `:quiet-hours="true"` to CnAppRoot.
