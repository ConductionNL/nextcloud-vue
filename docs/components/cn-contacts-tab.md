# CnContactsTab

Sidebar tab for the `contacts` integration leaf. Renders the vCard contacts linked to an OpenRegister object grouped by role (Applicants / Handlers / Advisors / Other). Backed by `ContactService` + `ContactsProvider` via the OR REST surface `/api/objects/{r}/{s}/{id}/contacts`.

Tier-2: the tab hosts two header actions — **Link existing contact** (opens [`CnContactPicker`](./cn-contact-picker.md)) and **Add new contact** (opens [`CnContactCreate`](./cn-contact-create.md)). Both dialogs delegate the actual API call back to the tab so the loading + refresh handshake stays here.

## Usage

```vue
<CnContactsTab
  :object-id="objectId"
  :register="registerId"
  :schema="schemaId" />
```

## Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `objectId` | `String` | — | (required) The OR object's UUID. |
| `register` | `String` | `''` | The register slug or numeric id. |
| `schema` | `String` | `''` | The schema slug or numeric id. |
| `apiBase` | `String` | `/apps/openregister/api` | Base path for the OR REST API. |
| `linkExistingLabel` | `String` | `Link contact` | Header button label. |
| `addNewLabel` | `String` | `Add new contact` | Header button label. |

## Events

| Event | Payload | Description |
| ----- | ------- | ----------- |
| `open-reverse-lookup` | `{contactUid, displayName}` | Emitted when a contact row is clicked. Consumers route this into the reverse-lookup flyout. |
