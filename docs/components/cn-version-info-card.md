---
sidebar_position: 26
---

# CnVersionInfoCard

Displays app version information in admin settings. Shows current version, Nextcloud compatibility, and optional update notice.

## Props

![CnVersionInfoCard showing app name and version](/img/screenshots/cn-version-info-card.png)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `appName` | String | `''` | Application name |
| `version` | String | `''` | Current version string |
| `ncVersion` | String | `''` | Nextcloud version compatibility |
| `phpVersion` | String | `''` | PHP version compatibility |
| `databaseVersion` | String | `''` | Database version info |
| `updateAvailable` | Boolean | `false` | Show update notice |
| `latestVersion` | String | `''` | Latest available version |
| `loading` | Boolean | `false` | Loading state |

## Slots

| Slot | Description |
|------|-------------|
| `#extra-info` | Additional version info rows |

## Usage

```vue
<CnVersionInfoCard
  app-name="OpenRegister"
  version="1.5.0"
  nc-version="28+"
  php-version="8.1+"
  :update-available="true"
  latest-version="1.6.0" />
```
