# CnResourceSelect

An OpenRegister object picker that can **create a new object from the typed search term**.

It searches a `register` + `schema` for objects whose label matches what the user types and renders them as options. When the typed term matches no existing object, a synthetic **"Create '&lt;term&gt;'"** option appears at the bottom of the list; choosing it persists a new object (via `useObjectStore().saveObject`, writing the term to `labelField`) and selects it — so a user who can't find a record never hits a dead "no results" path, they just type the name and make one inline.

This closes the gap where a plain `NcSelect` against OpenRegister offers no way to create a missing option (e.g. an agent logging a call for a client that isn't in the system yet).

## Usage

```vue
<CnResourceSelect
  register="pipelinq"
  schema="client"
  label-field="name"
  :model-value="clientId"
  :input-label="t('pipelinq', 'Client')"
  @update:modelValue="clientId = $event"
  @create="onClientCreated" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `register` | String | — (required) | OpenRegister register slug to search/create in. |
| `schema` | String | — (required) | OpenRegister schema slug to search/create in. |
| `modelValue` | String \| Number | `''` | Currently-selected object id (v-model). |
| `labelField` | String | `'name'` | Object field used as the option label AND written on create. |
| `inputLabel` | String | `''` | Accessible input label for the underlying `NcSelect`. |
| `inputId` | String | `''` | DOM id for the input (a11y association). |
| `clearable` | Boolean | `true` | Whether the selection can be cleared. |
| `minChars` | Number | `2` | Minimum characters before searching / offering create. |
| `allowCreate` | Boolean | `true` | Offer the inline "Create '&lt;term&gt;'" option when the search yields no exact match. Off → behaves like a plain async object select. |
| `createDefaults` | Object | `{}` | Extra fields merged into the payload when creating a new object (e.g. a fixed `type`). `labelField` is always set to the term. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `string` | The selected (or newly-created) object id. |
| `create` | `object` | Emitted with the freshly-created OpenRegister object when the user chose "Create '&lt;term&gt;'". |
