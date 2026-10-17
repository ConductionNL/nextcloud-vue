---
sidebar_position: 26
---

import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnVersionInfoCard.md'

# CnVersionInfoCard

Displays application version information in admin settings pages. Shows the app name, installed version, optional configured version, and an update status indicator with an optional update button.

## Try it

<Playground component="CnVersionInfoCard" />

## Props

![CnVersionInfoCard showing app name and version](/img/screenshots/cn-version-info-card.png)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `appName` | String | *(required)* | Application name displayed in the version row |
| `appVersion` | String | *(required)* | Installed application version string |
| `title` | String | `'Version information'` | Section title |
| `description` | String | `'Information about the current application installation'` | Section description |
| `docUrl` | String | `''` | Documentation URL — shows an info icon link next to the title |
| `wide` | Boolean | `true` | Under the board look the card spans the whole settings grid, as the boards draw it. `false` keeps it one card in the grid. No effect without the board look. |
| `cardTitle` | String | `'Application information'` | Heading shown inside the card |
| `configuredVersion` | String | `''` | Configured version string (for apps that track configuration versions separately). When non-empty, an extra row is shown; the board look always shows the row, reading "Unknown" until the app passes a value, with ", up to date" after it when `showUpdateButton` is on and `isUpToDate` holds. |
| `isUpToDate` | Boolean | `true` | Whether the configured version matches the installed version. Controls the status indicator color. |
| `showUpdateButton` | Boolean | `false` | Whether to show an "Update" action button |
| `updating` | Boolean | `false` | Whether an update is currently in progress (shows a loading indicator on the button) |
| `additionalItems` | Array | `[]` | Extra key-value items: `[{ label, value, statusClass? }]` |
| `loading` | Boolean | `false` | Loading state |
| `labels` | Object | `{}` | Override the standard row labels (`appName`, `version`, `configuredVersion`). A label left out keeps the translated default ("Application name", "Version", "Configured version"; in Dutch "Naam van de app", "Versie", "Ingestelde versie"). |

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

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnVersionInfoCard.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnVersionInfoCard/CnVersionInfoCard.vue) and update automatically whenever the component changes.

<GeneratedRef />

## Board look

Under the board look (`look` prop or `cnLook`) the facts are a two-column list and the state button and the actions (re-import) move into a footer row after a hairline. The support footer follows the row.

## Board look

In the board look the card is compact (boards DqBeheerinstellingen, DqInstellingenAlgemeen): no "Application name" row (the description names the app), the configured version with the up-to-date state inline ("0.4.47, bijgewerkt") instead of a separate disabled button, and a row of buttons under the facts with no rule above it. The update button shows there only while an update is due. Inside `CnAdminSettingsShell` the support lines become one "Support" row, re-import is a secondary button, and the description reads "About this <App> installation."
