# CnPartyPicker

One search field over several kinds of party: people and organisations from OpenRegister register sets (BRP persons, KvK companies, an app's own clients) and the reader's Nextcloud contacts, in one list. Each row shows initials, the name and a second line starting with the kind, as board DqNieuweZaak draws "Aanvrager" ("Henk Visser · Inwoner · Beukenlaan 3", "Visser Bouw B.V. · Organisatie · KvK 24157431"). It is built on [CnSearchSelect](./cn-search-select.md).

## Usage

```vue
<CnPartyPicker
  v-model="form.requester"
  input-label="Requester"
  placeholder="Name, BSN, trade name or KvK number"
  :sources="[
    { id: 'person', register: 'dossiq', schema: 'brpPerson', label: 'Resident', title: '{firstName} {lastName}', secondary: '{residence.street} {residence.houseNumber}' },
    { id: 'company', register: 'dossiq', schema: 'kvkCompany', label: 'Organisation', title: '{tradeName}', secondary: 'KvK {sourceId}' },
    { id: 'contact', type: 'contacts', label: 'Contact' },
  ]"
  @select="onRequester" />
```

Typing two characters or more searches every source at once (OpenRegister's `_search`, or Nextcloud's contacts menu for `type: "contacts"`); a source that fails adds nothing. `update:modelValue` emits the chosen row's id, and `select` the whole choice `{ source, id, label, secondary, row }`, so a host can store more than the id (a case's initiator type, source id and display name). A value the list does not hold shows `selectedLabel`, or is looked up by id in the OpenRegister sources.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | String \| Number | `null` | The chosen party's id |
| `sources` | Array | `[]` | `{ id, register, schema, label?, title?, secondary?, limit?, icon? }` per OpenRegister set (`title` and `secondary` templates filled from the row, `label` the kind, through the app's translate), or `{ id, type: "contacts", label? }` |
| `inputLabel` | String | `''` | The field's label |
| `labelOutside` | Boolean | `false` | Draw the label above the field |
| `placeholder` | String | `''` | Placeholder, through the app's translate |
| `selectedLabel` | String | `''` | The chosen party's name before the list holds it |
| `clearable` | Boolean | `true` | Offer a clear button |
| `disabled` | Boolean | `false` | Disable the field |
| `minLength` | Number | `2` | The fewest characters a search needs |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | id or `null` | The chosen party's id |
| `select` | `{ source, id, label, secondary, row }` or `null` | The whole choice |
