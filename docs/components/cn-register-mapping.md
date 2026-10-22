---
sidebar_position: 27
---

import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnRegisterMapping.md'

# CnRegisterMapping

OpenRegister register/schema configuration panel. Lets admin users map app object types to OpenRegister registers and schemas. Groups related object types together, shows a register dropdown (with auto-schema-matching), and a save/reimport action area.

**Wraps**: NcSelect, NcNoteCard, NcButton, NcLoadingIcon (via CnSettingsSection)

## Try it

<Playground component="CnRegisterMapping" />

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
| `collapseGroups` | Boolean | `null` | Each group is a heading button that opens and closes it, with its configured count shown while closed; the groups start closed. `null` does this when there is more than one group; `true` or `false` forces it. |
| `look` | String | `''` | `board` or `nextcloud`; empty follows the provided `cnLook`. The board look draws one open group as a type/schema table and the others as rows with a status chip, and saves at the end of the section |
| `boardRowLimit` | Number | `4` | Board look: how many types the open group lists before the "show all" line; `0` lists every type |
| `boardLayout` | String | `'table'` | Board look: `table` draws the open group's type and schema table with the other groups as rows (PqBeheer); `selects` draws, per group, the register select and a schema select per type in a grid of three, one column on a narrow screen (DqBeheerinstellingen) |
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

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnRegisterMapping.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnRegisterMapping/CnRegisterMapping.vue) and update automatically whenever the component changes.

<GeneratedRef />
