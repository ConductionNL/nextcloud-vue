---
sidebar_position: 24
---

# CnSettingsSection

Admin settings section with loading and error states. Wraps NcSettingsSection with async data fetching patterns.

**Wraps**: NcSettingsSection, NcLoadingIcon, NcButton, NcNoteCard

![CnSettingsSection showing admin settings with Version and Register Configuration sections](/img/screenshots/cn-settings-section.png)

![CnSettingsSection showing admin settings with Version and Register Configuration sections](/img/screenshots/cn-settings-section.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | `''` | Section title |
| `description` | String | `''` | Section description |
| `loading` | Boolean | `false` | Loading state |
| `error` | String | `null` | Error message to display |
| `saveLabel` | String | `'Save'` | Save button label |
| `saving` | Boolean | `false` | Save in progress |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `save` | — | Save button clicked |
| `retry` | — | Retry button clicked (on error) |

## Slots

| Slot | Description |
|------|-------------|
| `default` | Section content |
| `#actions` | Extra action buttons |

## Usage

```vue
<CnSettingsSection
  title="API Configuration"
  :loading="loading"
  :error="error"
  :saving="saving"
  @save="onSave"
  @retry="fetchSettings">
  <NcTextField label="API URL" v-model="apiUrl" />
  <NcTextField label="API Key" v-model="apiKey" type="password" />
</CnSettingsSection>
```
