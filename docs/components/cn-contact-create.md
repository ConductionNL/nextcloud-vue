# CnContactCreate

Modal dialog for creating a brand-new CardDAV contact + linking it to an OpenRegister object in a single step (Tier-2 of the contacts integration leaf).

The dialog itself does NOT perform the create — it emits a `create` event with the form payload. The parent (typically [`CnContactsTab`](./cn-contacts-tab.md)) POSTs `/api/objects/{r}/{s}/{id}/contacts/new` and on success closes the dialog + refreshes the linked-contacts list.

Lives in its own `.vue` file under `src/components/CnContactCreate/` per ADR-004 (modal isolation).

## Usage

```vue
<CnContactCreate
  v-if="showCreate"
  :loading="createLoading"
  @create="onCreateSubmit"
  @close="showCreate = false" />
```

## Form fields

| Field | Required | Notes |
| ----- | -------- | ----- |
| `displayName` | yes | Shown in the contact list. Trimmed; whitespace-only is rejected. |
| `email` | no | Validated against a basic `local@host.tld` regex. |
| `phone` | no | Free-text. |
| `org` | no | Primary organisation. |
| `role` | no | Picked from a dropdown (Applicant/Handler/Advisor/Other) or freeform. |

## Events

| Event | Payload | Description |
| ----- | ------- | ----------- |
| `create` | `{displayName, email, phone, org, role}` | Emitted when the user submits a valid form. |
| `close` | — | Emitted on cancel or close. |
