# CnConfigurationStore

A self-contained `NcAppSettingsSection` for the **federated configuration
store** (OpenRegister). It renders inside `CnAppRoot`'s `#user-settings` slot,
next to the credential-broker pane, so apps adopting the manifest shell get a
working store settings panel for free.

## What it does

The store lets any app publish its configuration to, and adopt it from, GitHub
through OpenRegister's federated-config engine. This panel is the user's control
surface for it and does three things:

1. **Store credential** — the user chooses **which** of their GitHub credentials
   the store uses to publish and to browse. The store never assumes the user's
   only (or first) GitHub key is the one they meant to use; the choice is
   persisted to the `federated-config-credential` user preference.
2. **Signing key** — shows this instance's Ed25519 signing public key (with a
   copy button) so the operator can hand it to organisations that want to trust
   the configuration they publish.
3. **Browse** — the user picks a shareable type and the panel discovers the
   bundles published to GitHub under that type's topic, listing them as links.
4. **Trust & governance** (administrators only) — reads and edits the
   organisation's source allowlist, trusted publisher keys, and publish/install
   group lists. The block is hidden for non-admins (the endpoint returns 403).

All calls go to OpenRegister's `/api` surface, and the panel fails soft (an info
note) when OpenRegister can't be reached:

```
GET  /apps/openregister/api/credentials?scope=personal              → { results: [{ id, name, provider, ... }] }
GET  /apps/openregister/api/preferences/federated-config-credential → { value }
PUT  /apps/openregister/api/preferences/federated-config-credential → { value }
GET  /apps/openregister/api/federated-config/types                  → { types: [{ id, name, topic }] }
GET  /apps/openregister/api/federated-config/discover?topic=<t>     → { results: [{ repo, url, stars, description }] }
GET  /apps/openregister/api/federated-config/public-key             → { publicKey }
GET  /apps/openregister/api/federated-config/trust                  → { sourceAllowlist, trustedKeys, publishGroups, installGroups } (admin; 403 otherwise)
PUT  /apps/openregister/api/federated-config/trust                  → { field, value }
```

Only credentials whose `provider` is `github` are offered in the picker.

## Props, events, slots

This component is fully self-contained: it takes **no props**, emits **no
events**, and exposes **no named slots** — it fetches and persists its own
state. Drop it in wherever an app-settings section is rendered (most commonly
`CnAppRoot`'s `#user-settings` slot, where it is mounted by default).

## Usage

```vue
<template>
  <NcAppSettingsDialog :open="open" :name="t('myapp', 'Settings')">
    <CnConfigurationStore />
  </NcAppSettingsDialog>
</template>

<script>
import { CnConfigurationStore } from '@conduction/nextcloud-vue'

export default {
  components: { CnConfigurationStore },
}
</script>
```
