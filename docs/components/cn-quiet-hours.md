# CnQuietHours

The quiet-hours block of the notification settings. It reads and saves the
current user's delivery window in OpenRegister, which holds notifications back
during those hours. The window is per user and applies to every app that sends
notifications through Open Register, and the block says so under its fields.

## What it does

```
GET  /apps/openregister/api/notification-delivery-window
     → { enabled, start, end, timezone, days } | { enabled: false }

PUT  /apps/openregister/api/notification-delivery-window
     → { enabled: true, start: "22:00", end: "07:00", timezone: "Europe/Amsterdam" }
     → { enabled: false }                              // clears the window
```

The time zone is the browser's (`Intl.DateTimeFormat().resolvedOptions().timeZone`).
Nothing is kept in the app or in browser storage.

| Answer | Block |
|---|---|
| 200 | the stored values, no note |
| 422 | OpenRegister's `error` next to the fields, values kept |
| 404 | "Your Nextcloud does not enforce quiet hours yet", values kept in the form |
| other | "Saving failed. Try again." |

## Where it shows

`CnNotificationPreferences` draws it under the notifications when the app asks
for it, so every other app looks as before:

```vue
<CnAppRoot app-id="learniq" :quiet-hours="true" ... />
```

or, outside CnAppRoot, `<CnNotificationPreferences :quiet-hours="true" />`.
It can also be mounted on its own: `<CnQuietHours @saved="onSaved" />`.

## Props, events, slots

No props. Emits `saved` with the stored window after a successful save.
