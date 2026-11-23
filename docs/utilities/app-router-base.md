# appRouterBase

`appRouterBase(appId, pathname?)` gives the vue-router base for this page load. Nextcloud serves an app under both `/apps/<appId>` and `/index.php/apps/<appId>`. The base keeps the form of `pathname` (default `window.location.pathname`) the reader arrived on, and falls back to `generateUrl('/apps/<appId>')`. A deep link on the other form is then not redirected to the start page.

```js
appRouterBase('larpinq', '/index.php/apps/larpinq/characters/1') // '/index.php/apps/larpinq'
```

Part of [mountCnApp](./mount-cn-app.md).
