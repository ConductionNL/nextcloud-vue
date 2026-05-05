CnPageRenderer is a type dispatcher mounted inside `<router-view>`. It matches `$route.name === page.id` and dispatches by `page.type` (`index | detail | dashboard | custom`). It is used automatically inside CnAppRoot and is not intended for standalone use.

In a manifest-driven app, it is mounted as:

```vue
<template>
  <!-- Inside the CnAppRoot shell -->
  <CnPageRenderer />
</template>
```

The manifest's `pages[]` array drives which component renders for each route:

```json
{
  "pages": [
    { "id": "contacts-index", "route": "/contacts", "type": "index", "config": { "register": "contacts", "schema": "contact" } },
    { "id": "contacts-detail", "route": "/contacts/:id", "type": "detail", "config": { "register": "contacts", "schema": "contact" } },
    { "id": "settings", "route": "/settings", "type": "custom", "component": "SettingsPage" }
  ]
}
```

See `docs/components/cn-page-renderer.md` for the full config API.
