---
sidebar_position: 28
---

import GeneratedRef from './_generated/CnRegisterSchemaSelect.md'

# CnRegisterSchemaSelect

Paired **Register + Schema** dropdowns for the OpenRegister-data-driven dashboard widget forms (stat / delta / gauge / object-list / chart / stats-block).

It self-fetches the available registers and their schemas from OpenRegister (`/apps/openregister/api/registers?_extend[]=schemas`), so authors pick from a list instead of typing slugs. The schema dropdown is scoped to the selected register's schemas and stays disabled until a register is chosen. Emitted values are the register/schema **slugs** that the widget renderers and `fetchSchemaProperties` expect.

Vue 2 `.sync`-style — it emits `update:register` / `update:schema`, so a parent can bind with `:register.sync` / `:schema.sync` or explicit handlers:

```vue
<CnRegisterSchemaSelect
  :register="source.register"
  :schema="source.schema"
  @update:register="updateSource('register', $event)"
  @update:schema="updateSource('schema', $event)" />
```

**Wraps**: NcSelect (×2)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `register` | String | `''` | Currently selected register slug (v-model:register). |
| `schema` | String | `''` | Currently selected schema slug (v-model:schema). Cleared automatically when `register` changes. |
| `disabled` | Boolean | `false` | Disable both dropdowns. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:register` | `string` | The chosen register slug (or `''` when cleared). |
| `update:schema` | `string` | The chosen schema slug (or `''` when cleared / on register change). |

<GeneratedRef />
