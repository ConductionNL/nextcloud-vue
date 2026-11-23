# disableWebPush

`disableWebPush({ scope })` switches web push off for this device: it unsubscribes and removes the registration (`DELETE /apps/openregister/webpush/subscription` with the endpoint). It resolves true when nothing is subscribed any more. `scope` is the app's service worker scope.

See [CnWebPushToggle](../components/cn-web-push-toggle.md).
