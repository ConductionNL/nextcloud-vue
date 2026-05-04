---
sidebar_position: 27
---

# CnRegisterMapping

OpenRegister register/schema configuration panel. Lets admin users map app object types to OpenRegister registers and schemas. Groups related object types together, shows a register dropdown (with auto-schema-matching), and a save/reimport action area.

**Wraps**: NcSelect, NcNoteCard, NcButton, NcLoadingIcon (via CnSettingsSection)

![CnRegisterMapping showing register and schema dropdowns for each entity type](/img/screenshots/cn-register-mapping.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `groups` | Array | *(required)* | Groups of object types that share a register. Each group: `{ name, description?, registerConfigKey?, types: [{ slug, label, description?, configKey? }] }` |
| `name` | String | `'Register configuration'` | Section title |
| `description` | String | `'Configure OpenRegister schema mappings for your object types'` | Section description |
| `docUrl` | String | `''` | Documentation URL — shows an info icon next to the title |
| `configuration` | Object | `{}` | Current configuration values keyed by config key: `{ register: '5', client_schema: '28', ... }` |
| `showSaveButton` | Boolean | `true` | Whether to show the Save button |
| `saving` | Boolean | `false` | Whether a save is in progress |
| `showReimportButton` | Boolean | `false` | Whether to show the Re-import button |
| `reimporting` | Boolean | `false` | Whether a reimport is in progress |
| `saveButtonText` | String | `'Save configuration'` | Save button label |
| `reimportButtonText` | String | `'Re-import configuration'` | Re-import button label |
| `autoMatch` | Boolean | `true` | When a register is selected, automatically match schema titles to object type slugs |
| `labels` | Object | `{ register, schema, configured, notConfigured, noSchemas, selectRegister, selectSchema, allConfigured, partiallyConfigured }` | Override UI strings (all default to translated English) |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:configuration` | `configuration` | Emitted when any register or schema selection changes (use with `.sync` or `v-model`) |
| `save` | — | Save button clicked |
| `reimport` | — | Re-import button clicked |

## Slots

| Slot | Description |
|------|-------------|
| `#actions` | Extra action buttons rendered alongside Save/Re-import |
| `#group-header` | Custom header content for each group (scoped: `{ group }`) |
| `#footer` | Footer content below the configuration section |

## Usage

```vue
<CnRegisterMapping
  :groups="[
    {
      name: 'Client management',
      registerConfigKey: 'client_register',
      types: [
        { slug: 'client', label: 'Clients', configKey: 'client_schema' },
        { slug: 'contact', label: 'Contacts', configKey: 'contact_schema' },
      ],
    },
  ]"
  :configuration="settings"
  :saving="saving"
  @update:configuration="settings = $event"
  @save="onSave" />
```

This component is typically used in the admin settings page of an app to let administrators configure which OpenRegister registers and schemas map to each entity type.
