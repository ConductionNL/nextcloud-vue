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
| `enabled` | `boolean` | When `false`, the action reads "Enable" (installed but disabled). Otherwise it reads "Install and enable" |

## Install / enable action (admin-aware)

For each dependency the component renders, by user role:

- **Admin** (`getCurrentUser().isAdmin`): an **Install and enable** / **Enable** button driven by [`useAppInstaller`](../utilities/composables/use-app-installer.md). One click confirms the admin's password, then downloads-installs-and-enables the app via Nextcloud's install endpoint — the NC34+ bundled-`appstore` OCS API, falling back to the legacy `settings/apps/enable` route on ≤NC33 — and reloads on success. On failure the error shows inline and the store link (`resolveLink(dep)`) stays as a fallback. See the composable's [Adoption notes](../utilities/composables/use-app-installer.md#adoption-notes) for the `@nextcloud/dialogs` ^6 build requirement.
- **Non-admin**: "ask your administrator to enable `{name}`" copy (they cannot hit the admin-only endpoint) — no dead-end link.

The label is **Install and enable** when the app is not installed and **Enable** when `dep.enabled === false` (installed but disabled).

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dependencies` | `Array` | — (required) | Array of dependency objects (see shape above) |
| `appName` | `String` | `''` | Optional name of the host app. Currently informational; reserved for templated headings |
| `heading` | `String` | `'Required apps are missing'` | Top heading text |
| `intro` | `String` | `'This app needs the following Nextcloud apps to be installed and enabled.'` | Introductory paragraph |
| `installLabel` | `String` | `'Install and enable'` | Label for the action when the app is not installed |
| `enableLabel` | `String` | `'Enable'` | Label for the action when `dep.enabled === false` (installed but disabled) |
| `askAdminLabel` | `String` | `'Ask your administrator to enable {name}'` | Non-admin copy; `{name}` is replaced by the dependency's display name |

## CSS

Class prefix: `cn-dependency-missing__*`. Uses Nextcloud CSS variables only (`--color-main-background`, `--color-main-text`, `--color-text-maxcontrast`, `--color-border`, `--color-primary-element`, `--default-grid-baseline`).

## Related

- [CnAppRoot](./cn-app-root.md) — Mounts this component during the dependency-check phase.
- [useAppInstaller](../utilities/composables/use-app-installer.md) — Backs the admin-aware install/enable action.
- [useAppStatus](../utilities/composables/use-app-status.md) — Detects per-app installed/enabled status.
