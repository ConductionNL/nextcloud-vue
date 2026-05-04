---
sidebar_position: 26
---

# CnVersionInfoCard

Displays application version information in admin settings pages. Shows the app name, installed version, optional configured version, and an update status indicator with an optional update button.

## Props

![CnVersionInfoCard showing app name and version](/img/screenshots/cn-version-info-card.png)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `appName` | String | *(required)* | Application name displayed in the version row |
| `appVersion` | String | *(required)* | Installed application version string |
| `title` | String | `'Version information'` | Section title |
| `description` | String | `'Information about the current application installation'` | Section description |
| `docUrl` | String | `''` | Documentation URL — shows an info icon link next to the title |
| `cardTitle` | String | `'Application information'` | Heading shown inside the card |
| `configuredVersion` | String | `''` | Configured version string (for apps that track configuration versions separately). When non-empty, an extra row is shown. |
| `isUpToDate` | Boolean | `true` | Whether the configured version matches the installed version. Controls the status indicator color. |
| `showUpdateButton` | Boolean | `false` | Whether to show an "Update" action button |
| `updating` | Boolean | `false` | Whether an update is currently in progress (shows a loading indicator on the button) |
| `additionalItems` | Array | `[]` | Extra key-value items: `[{ label, value, statusClass? }]` |
| `loading` | Boolean | `false` | Loading state |
| `labels` | Object | `{ appName: 'Application Name', version: 'Version', configuredVersion: 'Configured Version' }` | Override the standard row labels |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update` | — | Emitted when the Update button is clicked |

## Slots

| Slot | Description |
|------|-------------|
| `#actions` | Extra action buttons in the card header |
| `#additional-items` | Custom additional items (replaces `additionalItems` prop rendering) |
| `#footer` | Footer content below the card |
| `#extra-cards` | Additional cards rendered after the version info card |

## Usage

```vue
<CnVersionInfoCard
  app-name="OpenRegister"
  app-version="1.5.0"
  configured-version="1.4.0"
  :is-up-to-date="false"
  :show-update-button="true"
  :updating="updating"
  @update="runUpdate" />
```
