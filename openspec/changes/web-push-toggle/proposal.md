# A person can switch web push on for this device

## Why
humaniq's Mijn HR offers "Meldingen op dit apparaat" (`self-service-mobile` task 2.3, design D5): an opt-in on a user
gesture that registers the browser's push subscription with OpenRegister's `web-push` channel. OpenRegister serves
`/webpush/vapid-public-key` and `/webpush/subscription`; the library had nothing that calls them.

## What changes
`utils/webPush.js` (`webPushSupported`, `currentPushSubscription`, `enableWebPush`, `disableWebPush`) and
`CnWebPushToggle`, a switch that reads the current subscription on mount, asks permission only on a flip, and says why
it could not switch. Exported from the barrel. Dutch strings added.
