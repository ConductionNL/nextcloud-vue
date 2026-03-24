---
sidebar_position: 27
---

# CnRegisterMapping

OpenRegister register/schema configuration panel. Allows admin users to map app object types to OpenRegister registers and schemas.

**Wraps**: NcSelect, NcNoteCard, NcButton, NcLoadingIcon

![CnRegisterMapping showing register and schema dropdowns for each entity type](/img/screenshots/cn-register-mapping.png)

![CnRegisterMapping showing source, register, and schema dropdowns for each entity type](/img/screenshots/cn-register-mapping.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `objectTypes` | Object | `\{\}` | Map of `\{ typeSlug: \{ source, register, schema \} \}` |
| `registers` | Array | `[]` | Available registers |
| `schemas` | Array | `[]` | Available schemas |
| `sources` | Array | `[]` | Available sources |
| `loading` | Boolean | `false` | Loading state |
| `saving` | Boolean | `false` | Save in progress |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `save` | `mappings` | Save mappings object |
| `refresh` | — | Refresh registers/schemas list |
| `auto-detect` | — | Auto-detect schemas from register |

## Usage

```vue
<CnRegisterMapping
  :object-types="settings.objectTypes"
  :registers="registers"
  :schemas="schemas"
  :sources="sources"
  :loading="loading"
  :saving="saving"
  @save="onSaveMappings"
  @refresh="fetchRegisters" />
```

This component is typically used in the admin settings page of an app to let administrators configure which OpenRegister registers and schemas map to each entity type in the app.
