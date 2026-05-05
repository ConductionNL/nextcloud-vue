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

Standalone usage outside of CnAppRoot — pass props explicitly instead of relying on inject:

```vue
<template>
  <CnPageRenderer
    :manifest="manifest"
    :custom-components="{ SettingsPage }"
    :translate="(key) => t('myapp', key)"
    :page-types="{ ...defaultPageTypes, report: MyReportPage }" />
</template>
```

See `docs/components/cn-page-renderer.md` for the full config API.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `manifest` | Object | `null` | Manifest object. When omitted, falls back to the injected `cnManifest` from a `CnAppRoot` ancestor |
| `customComponents` | Object | `null` | Custom-component registry. Keys match `page.component` for `type: "custom"` pages. Falls back to injected `cnCustomComponents` |
| `translate` | Function | `null` | Translate function. Falls back to injected `cnTranslate`. Exposed for symmetry — page components can `inject('cnTranslate')` directly |
| `pageTypes` | Object | `null` | Page-type registry: map of `pages[].type` → Vue component. Falls back to injected `cnPageTypes` and finally to the library's `defaultPageTypes`. The special `custom` type resolves through `customComponents` instead |
