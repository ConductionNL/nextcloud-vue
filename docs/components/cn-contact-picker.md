# CnContactPicker

Modal dialog for selecting an existing CardDAV contact to link to an OpenRegister object (Tier-2 of the contacts integration leaf — see ADR-019).

Search is hit-as-you-type against the OR-side contact search endpoint (`GET {apiBase}/contacts/search?q=<term>`) which proxies CardDAV via `OCP\Contacts\IManager`. Each row shows the avatar + display name + primary email. A role dropdown (Applicant / Handler / Advisor / Other or freeform) tags the link before confirming.

Lives in its own `.vue` file under `src/components/CnContactPicker/` per ADR-004 (modal isolation).

## Usage

```vue
<CnContactPicker
  v-if="showPicker"
  :api-base="apiBase"
  @link="onPickerLink"
  @close="showPicker = false" />
```

The parent (typically [`CnContactsTab`](./cn-contacts-tab.md)) handles the actual POST to `/api/objects/{r}/{s}/{id}/contacts` and the list refresh.

## Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `apiBase` | `String` | `/apps/openregister/api` | Base path for the OR REST API. |
| `title` | `String` | `Link contact` | Dialog title. |
| `roleOptions` | `Array` | Applicant/Handler/Advisor/Other | Role dropdown choices. |

## Events

| Event | Payload | Description |
| ----- | ------- | ----------- |
| `link` | `{contactUid, addressbookId, contactUri, displayName, email, role}` | Emitted when the user confirms a selection. |
| `close` | — | Emitted on cancel or close. |

## Label props

All optional, pre-translated overrides:

| Prop | Type | Description |
|------|------|-------------|
| `searchLabel` | String | A11y label for the search field. |
| `searchPlaceholder` | String | Placeholder for the search field. |
| `emptyLabel` | String | Title for the empty/no-results state. |
| `emptyDescription` | String | Description for the empty/no-results state. |
| `unknownLabel` | String | Fallback label for a contact with no display name. |
| `roleLabel` | String | Label for the contact role field. |
| `cancelLabel` | String | Cancel button label. |
| `confirmLabel` | String | Confirm/link button label. |
