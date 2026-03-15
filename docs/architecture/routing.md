# Routing

All Conduction Nextcloud apps use **Vue Router in history mode** with clean URLs.

## Rules

- **Always use `mode: 'history'`** — never hash mode (`/#/`)
- Use `generateUrl('/apps/myapp')` from `@nextcloud/router` as the `base`
- Add a PHP catch-all route so direct navigation and page refresh work
- Use `:exact="true"` on the Dashboard nav item to prevent it staying highlighted on all routes

## Router Setup

```js
// src/router/index.js
import Vue from 'vue'
import Router from 'vue-router'
import { generateUrl } from '@nextcloud/router'

Vue.use(Router)

export default new Router({
  mode: 'history',
  base: generateUrl('/apps/myapp'),
  routes: [
    { path: '/', name: 'Dashboard', component: Dashboard },
    { path: '/items', name: 'Items', component: ItemList },
    { path: '/items/:id', name: 'ItemDetail', component: ItemDetail,
      props: route => ({ itemId: route.params.id }) },
    { path: '*', redirect: '/' },
  ],
})
```

## PHP Catch-All Route

Add this as the **last** route in `appinfo/routes.php`, after all API routes:

```php
// SPA catch-all — serves the Vue app for any frontend route (history mode)
['name' => 'dashboard#page', 'url' => '/{path}', 'verb' => 'GET',
 'requirements' => ['path' => '.+'], 'defaults' => ['path' => '']],
```

This makes Nextcloud serve the app's main template for any path that doesn't match an API route, so Vue Router can handle it client-side.

## Navigation

Use `:exact="true"` on the Dashboard `NcAppNavigationItem` so it only highlights on the root path `/`, not on every route:

```vue
<NcAppNavigationItem
  :name="t('myapp', 'Dashboard')"
  :to="{ name: 'Dashboard' }"
  :exact="true">
  <template #icon><ViewDashboard :size="20" /></template>
</NcAppNavigationItem>
```

## Why Not Hash Mode?

- Hash mode (`/#/characters`) looks unprofessional and breaks expected browser behavior
- History mode (`/characters`) gives clean, shareable URLs
- Nextcloud's server-side routing already supports catch-all routes
- OpenCatalogi already uses history mode — all apps should be consistent
