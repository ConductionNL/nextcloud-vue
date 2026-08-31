# CnResourceSelect

An OpenRegister object picker that can **create a new object from the typed search term**.

It searches a `register` + `schema` for objects whose label matches what the user types and renders them as options. When the typed term matches no existing object, a synthetic **"Create '&lt;term&gt;'"** option appears at the bottom of the list; choosing it persists a new object (via `useObjectStore().saveObject`, writing the term to `labelField`) and selects it — so a user who can't find a record never hits a dead "no results" path, they just type the name and make one inline.

This closes the gap where a plain `NcSelect` against OpenRegister offers no way to create a missing option (e.g. an agent logging a call for a client that isn't in the system yet).

Three opt-in props cover what a plain object picker cannot do:

- **`filters`** scopes the options to a parent selection, which is what makes a cascading pair work — pick a client, and only that client's contacts are offered. Changing the scope clears a selection that is no longer valid in it.
- **`preload`** fetches a first page on mount so the field can be *browsed*, not only searched.
- **`createHandler`** replaces the built-in save. Creating from a bare term only works while the term is enough to satisfy the schema; the moment a required field has to come from somewhere else — a server-minted key, or a value worth collecting in a full dialog — the consumer owns the create and resolves the finished object back.

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

### Cascading pair

```vue
<CnResourceSelect
  register="pipelinq"
  schema="contact"
  :filters="{ client: form.client }"
  :disabled="!form.client"
  :preload="true"
  :model-value="form.contact"
  :input-label="t('pipelinq', 'Contact')"
  :create-handler="openContactDialog"
  @update:modelValue="form.contact = $event" />
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
| `filters` | Object | `{}` | Field filters merged into the search query, scoping the options to a parent selection (the cascading-select case). Changing the scope reloads the options and clears a selection that no longer belongs to it. Empty values are dropped rather than sent as `field=`. |
| `preload` | Boolean | `false` | Fetch a first page of options on mount (and on every `filters` change) so the field can be browsed without typing. Off by default so existing consumers issue no extra request. |
| `disabled` | Boolean | `false` | Disable the input — e.g. a dependent select still waiting on its parent. |
| `placeholder` | String | `''` | Placeholder text for the underlying `NcSelect`. |
| `createHandler` | Function | `null` | Override how a new object is created from the typed term. Receives `(term, payload)` and must resolve to the created object, or a falsy value to abort (e.g. the user cancelled a dialog). Without it the payload goes straight to `objectStore.saveObject`, which fails for any schema requiring a field the term cannot supply. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `string` | The selected (or newly-created) object id. |
| `create` | `object` | Emitted with the freshly-created OpenRegister object when the user chose "Create '&lt;term&gt;'". |
