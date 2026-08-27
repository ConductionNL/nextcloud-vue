# CnCredentials

A self-contained settings pane that lets the signed-in user manage the
credentials the **OpenRegister credential broker** holds on their behalf. The
user hands a secret to OpenRegister once; apps then make outbound calls
*through* OpenRegister without ever seeing the secret. It is mounted in
`CnAppRoot`'s `#user-settings` slot (wrapped in its own `NcAppSettingsSection`),
so apps adopting the manifest shell get a working credentials panel for free.

## What it does

`CnCredentials` is the browser surface over OpenRegister's credential API. A
secret is **write-only**: it is sent on create/update and is **never** returned
or displayed. The pane talks to these endpoints (all under
`/apps/openregister/api/credentials`):

```
GET    /api/credentials
       → { results: [{ '@self': { owner, ... }, id, name, provider, allowedApps[], createdAt }] }

GET    /api/credentials/providers
       → { results: [{ identifier, title }] }        // read-only provider catalogue

POST   /api/credentials
       body { name, provider, allowedApps?, secret? } // secret goes straight to the vault

PUT    /api/credentials/{id}
       body { name?, allowedApps?, secret? }          // metadata / allowed-apps / rotation

DELETE /api/credentials/{id}                           // deletes object + vault secret
```

The pane has three sections:

- **Apps requesting credentials** — read-only. Lists the current app's manifest
  `credentials[]` declarations (`{ provider, reason, scopes }`) so the user sees
  which providers this app can reach through the broker. Empty state when the
  app declares none.
- **Your credentials** — one row per stored credential (name, provider title,
  and the apps it is allowed for). Each row offers **Delete** (with an inline
  confirm step), **Duplicate** (prefills the add-form with name + provider +
  allowed apps; secret blank), and an **allowed-apps** editor (a taggable
  multiselect that saves via `PUT` on change).
- **Add credential** — a form with `name`, `provider` (from the provider
  catalogue), `secret` (write-only), and `allowedApps`. On save it `POST`s,
  reloads, and clears the form.

It degrades gracefully: an empty `appCredentials` prop, or a 404 from the OR
endpoints (broker not installed), leaves the lists empty and shows a friendly
note rather than crashing.

## Props

| Prop             | Type     | Default | Description                                                                                                   |
| ---------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| `appId`          | `String` | `''`    | The consuming Nextcloud app id. Seeds the allowed-apps picker and keeps the pane host-agnostic.               |
| `appName`        | `String` | `''`    | A friendly app name for copy ("`{app}` may use this credential"). Falls back to the `appId`.                     |
| `appCredentials` | `Array`  | `[]`    | The current app's manifest `credentials[]` declarations (`[{ provider, reason, scopes }]`), rendered read-only. |
| `vaultUrl`       | `String` | `null`  | Optional link target explaining the Keepiq vault. Defaults to the Keepiq app route; pass `''` to hide the link. |

The component emits **no events** and exposes **no named slots** — it fetches
and persists its own state.

## Usage

```vue
<template>
  <NcAppSettingsDialog v-model:open="open" :name="t('myapp', 'Settings')">
    <NcAppSettingsSection id="credentials" :name="t('myapp', 'Credentials')">
      <CnCredentials :app-id="appId" :app-credentials="manifest.credentials || []" />
    </NcAppSettingsSection>
  </NcAppSettingsDialog>
</template>

<script>
import { CnCredentials } from '@conduction/nextcloud-vue'

export default {
  components: { CnCredentials },
  data() {
    return { open: false, appId: 'myapp', manifest: {} }
  },
}
</script>
```

## Related

- [CnAppRoot](./cn-app-root.md) — mounts this component in its `#user-settings` slot by default.
- [CnNotificationPreferences](./cn-notification-preferences.md) — the sibling user-settings pane.
