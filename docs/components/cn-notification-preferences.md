# CnNotificationPreferences

A self-contained `NcAppSettingsSection` that lets the current user turn the
notifications declared by their accessible schemas on or off. It is the
default content of `CnAppRoot`'s `#user-settings` slot, so apps adopting the
manifest shell get a working notification-preferences panel for free.

## What it does

`CnNotificationPreferences` reads the **effective** preferences (each schema's
default merged with the user's overrides) and writes **override-only** values,
both through OpenRegister's notification-preferences endpoint:

```
GET  /apps/openregister/api/notification-preferences
     → { results: [{ schema, schemaTitle, notification, enabled, channels, source }], total }

PUT  /apps/openregister/api/notification-preferences
     → { schema, notification, enabled }            // set an override
     → { schema, notification, reset: true }         // clear the override
```

Preferences are **override-only**: leaving an item unchanged keeps the app
default, so apps that add new schemas or notifications keep working with no
per-user migration. A "Reset to default" action appears on any item the user
has overridden, removing the override.

The panel groups the flat preference list by schema (`schemaTitle` as the
heading) and renders one switch per notification. It degrades gracefully:

- **Loading** — a spinner while the GET is in flight.
- **Unavailable** — an empty state when OpenRegister can't be reached (the
  feature is OpenRegister-provided, so the panel is optional per instance).
- **No notifications** — an empty state when the user's schemas declare none.

## Props, events, slots

This component is fully self-contained: it takes **no props**, emits **no
events**, and exposes **no named slots** — it fetches and persists its own
state. Drop it in wherever an app-settings section is rendered (most commonly
via `CnAppRoot`'s `#user-settings` slot, which mounts it by default).

## Usage

```vue
<template>
  <NcAppSettingsDialog :open.sync="open" :name="t('myapp', 'Settings')">
    <CnNotificationPreferences />
  </NcAppSettingsDialog>
</template>

<script>
import { CnNotificationPreferences } from '@conduction/nextcloud-vue'

export default {
  components: { CnNotificationPreferences },
  data() {
    return { open: false }
  },
}
</script>
```

## Related

- [CnAppRoot](./cn-app-root.md) — mounts this component in its `#user-settings` slot by default.
