---
sidebar_position: 27
---

# CnAdminSettingsShell

The canonical chrome for a Conduction app's Nextcloud **admin settings page**. It renders the fleet-standard layout so the page header, version card, re-import action and support footer can never drift between apps again.

In top-to-bottom order it renders:

1. a **page title header** — `<App> Settings` / `Configure your <App> installation` (+ optional `docUrl`),
2. a **`CnVersionInfoCard`** — version (read from `loadState` when `appVersion` is omitted), an up-to-date badge, a **Re-import configuration** button wired to the AppHost endpoint `POST /apps/<appId>/api/settings/load`, and a support / SLA footer,
3. the app's own settings sections (the default `<slot>`).

Every app's `AdminRoot.vue` collapses to a thin wrapper around this component.

## Usage

Minimal:

```vue
<template>
	<CnAdminSettingsShell
		app-id="shillinq"
		app-name="Shillinq"
		doc-url="https://shillinq.conduction.nl/docs/intro"
		@reimported="reloadConfig">
		<MyRegisterMapping />
		<MyFeatureSettings />
	</CnAdminSettingsShell>
</template>

<script>
import { CnAdminSettingsShell } from '@conduction/nextcloud-vue'
export default { components: { CnAdminSettingsShell } }
</script>
```

With a real up-to-date check (when the backend reports a configured version):

```vue
<CnAdminSettingsShell
	app-id="opencatalogi" app-name="OpenCatalogi"
	:app-version="running" :configured-version="configured"
	:is-up-to-date="running === configured" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `appId` | String | *(required)* | Nextcloud app id; used for the default re-import endpoint and the version `loadState` key |
| `appName` | String | *(required)* | Human-readable name shown in the header and version card |
| `appVersion` | String | `''` | Running version. When empty, read from `loadState(appId, 'version', 'Unknown')` |
| `title` | String | `''` | Page title. Defaults to `"<appName> Settings"` |
| `description` | String | `''` | Page description. Defaults to `"Configure your <appName> installation"` |
| `docUrl` | String | `''` | Documentation URL (renders the info icon next to the title) |
| `showVersionCard` | Boolean | `true` | Whether to render the version card |
| `versionTitle` | String | `'Version information'` | Version card heading |
| `versionDescription` | String | `''` | Version card description. Defaults to `"Information about the current <appName> installation"` |
| `configuredVersion` | String | `''` | Configured version. When omitted, read from `loadState(appId, 'configuredVersion', '')` (AppHost stamps it on each config import) |
| `isUpToDate` | Boolean | `null` | Whether the install is up to date. When `null`, the shell reads the **real** value from `loadState(appId, 'isUpToDate', true)` (AppHost's GenericAdminSettings compares running vs imported config version). Pass an explicit boolean to override |
| `showUpdateButton` | Boolean | `true` | Show the version card's up-to-date / update button |
| `updating` | Boolean | `false` | Whether an update is in progress |
| `showReimport` | Boolean | `true` | Show the "Re-import configuration" action |
| `reimportUrl` | String | `''` | Override the re-import endpoint. Defaults to `/apps/<appId>/api/settings/load` |
| `showSupport` | Boolean | `true` | Render the default support footer |
| `supportEmail` | String | `'support@conduction.nl'` | Support contact email |
| `slaEmail` | String | `'sales@conduction.nl'` | SLA contact email (set `''` to hide the SLA line) |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update` | — | The version card's update button was clicked |
| `reimported` | `object` | Configuration was re-imported successfully (AppHost response payload) |
| `reimport-error` | `Error` | Configuration re-import failed |

## First-time setup actions (ADR-042)

Two optional actions surface the [`CnSetupWizard`](./cn-setup-wizard.md) and the
"help us" modal from the admin page (not personal settings):

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showSetup` | `boolean` | `false` | Show a "Run setup wizard" button that opens `CnSetupWizard`. |
| `setupSteps` | `Array` | `[]` | The `manifest.setup.steps` array passed to the wizard. |
| `showHelp` | `boolean` | `false` | Show a "Help us" button that opens `CnSuggestFeatureModal`. |
| `helpRepo` | `string` | `''` | `<owner>/<repo>` slug for the feature-request modal. |

## Slots

| Slot | Description |
|------|-------------|
| default | The app's own settings sections, rendered below the version card |
| `actions` | Extra action buttons next to the update / re-import buttons |
| `footer` | Replaces the default support / SLA footer |
| `version-items` | Extra key/value rows inside the version card details |
