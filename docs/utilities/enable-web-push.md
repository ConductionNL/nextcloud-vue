# enableWebPush

`enableWebPush({ scope })` switches web push on for this device through OpenRegister's `web-push` channel. It asks for notification permission, reads the VAPID key (`GET /apps/openregister/webpush/vapid-public-key`), subscribes through the app's service worker (`scope`, empty for the page's ready worker) and registers the subscription (`POST /apps/openregister/webpush/subscription`). Call it from a click only. It resolves `{ ok, reason? }`, with `reason` one of `unsupported`, `denied`, `not-configured`, `no-worker` or `failed`.

See [CnWebPushToggle](../components/cn-web-push-toggle.md).
