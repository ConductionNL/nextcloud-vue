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

## Form & label props

| Prop | Type | Description |
|------|------|-------------|
| `title` | String | Dialog title. |
| `displayNameLabel` | String | Label for the display-name field. |
| `displayNameHelper` | String | Helper text under the display-name field. |
| `emailLabel` | String | Label for the email field. |
| `emailHelper` | String | Helper text under the email field. |
| `phoneLabel` | String | Label for the phone field. |
| `orgLabel` | String | Label for the organisation field. |
| `roleLabel` | String | Label for the role field. |
| `cancelLabel` | String | Cancel button label. |
| `confirmLabel` | String | Confirm/create button label. |
| `displayNameRequiredMsg` | String | Validation message when the display name is empty. |
| `emailInvalidMsg` | String | Validation message for an invalid email. |
| `roleOptions` | Array | Selectable role options for the role field. |
