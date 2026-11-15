# CnWebPushToggle

A switch that turns web push on or off for this device, through OpenRegister's `web-push` channel (ADR-031). It never asks for permission on its own. The browser's prompt appears only after the person flips the switch, and on mount the switch only reads whether this device is subscribed already.

Switching on asks for permission, reads OpenRegister's VAPID key (`GET /apps/openregister/webpush/vapid-public-key`), subscribes through the app's service worker and registers the subscription (`POST /apps/openregister/webpush/subscription`). Switching off unsubscribes and removes it (`DELETE`). OpenRegister decides what is sent. The app's service worker shows the notification and routes the click.

```vue
<CnWebPushToggle :hint="t('humaniq', 'On an iPhone, add Mijn HR to the home screen first.')" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | String | `''` | The switch label; empty reads "Notifications on this device". |
| `hint` | String | `''` | A line under the switch while nothing went wrong. |
| `scope` | String | `''` | The scope of the app's service worker; empty uses the page's ready worker. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `change` | `boolean` | Whether this device now receives web push. |

When the switch cannot do its job, the line under it says why: the browser has no push, the site's notifications are blocked, the server has no VAPID key, the app's worker is not ready, or the request failed.

## Utilities

`webPushSupported()`, `currentPushSubscription({ scope })`, `enableWebPush({ scope })` (resolves `{ ok, reason? }`) and `disableWebPush({ scope })` are exported for hosts that draw their own control. Call `enableWebPush` from a click only.
