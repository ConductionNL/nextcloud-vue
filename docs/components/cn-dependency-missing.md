# CnDependencyMissing

Full-page screen shown when one or more apps declared in `manifest.dependencies` are not installed or not enabled. [`CnAppRoot`](./cn-app-root.md) mounts this in its dependency-check phase — between **loading** and **shell** — based on per-dependency results from [`useAppStatus`](../utilities/composables/use-app-status.md).

Apps can override CnAppRoot's `#dependency-missing` slot to customise the screen (or skip CnAppRoot entirely).

## Usage

### As CnAppRoot's default dependency-missing screen (typical)

```vue
<CnAppRoot :manifest="manifest" app-id="decidesk">
  <!-- nothing else needed; CnDependencyMissing renders automatically -->
</CnAppRoot>
```

### Customised via props

```vue
<CnAppRoot ...>
  <template #dependency-missing="{ dependencies }">
    <CnDependencyMissing
      :dependencies="dependencies"
      app-name="Decidesk"
      heading="OpenRegister is required"
      intro="Decidesk needs OpenRegister to manage decisions."
      install-label="Install"
      enable-label="Enable" />
  </template>
</CnAppRoot>
```

## Dependency shape

`dependencies` is an array of objects with this shape:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Required. Nextcloud app id (matches entries in `manifest.dependencies`) |
| `name` | `string` | Optional human-readable label; falls back to `id` when omitted |
| `installUrl` | `string` | Optional override URL. Defaults to `/index.php/settings/apps` |
| `enabled` | `boolean` | When `false`, the link reads "Enable" (installed but disabled). Otherwise it reads "Install" |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dependencies` | `Array` | — (required) | Array of dependency objects (see shape above) |
| `appName` | `String` | `''` | Optional name of the host app. Currently informational; reserved for templated headings |
| `heading` | `String` | `'Required apps are missing'` | Top heading text |
| `intro` | `String` | `'This app needs the following Nextcloud apps to be installed and enabled.'` | Introductory paragraph |
| `installLabel` | `String` | `'Install'` | Label for the install link |
| `enableLabel` | `String` | `'Enable'` | Label for the enable link (used when `dep.enabled === false`) |

## CSS

Class prefix: `cn-dependency-missing__*`. Uses Nextcloud CSS variables only (`--color-main-background`, `--color-main-text`, `--color-text-maxcontrast`, `--color-border`, `--color-primary-element`, `--default-grid-baseline`).

## Related

- [CnAppRoot](./cn-app-root.md) — Mounts this component during the dependency-check phase.
- [useAppStatus](../utilities/composables/use-app-status.md) — Detects per-app installed/enabled status.
