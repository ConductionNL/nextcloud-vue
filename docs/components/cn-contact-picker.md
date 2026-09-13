# CnContactPicker

Modal dialog for picking a person to link to an OpenRegister object: a Nextcloud user or an existing CardDAV contact (people on objects; see ADR-019).

Search is hit-as-you-type against two sources. Contacts come from the OR-side search endpoint (`GET {apiBase}/contacts/search?q=<term>`), which proxies CardDAV via `OCP\Contacts\IManager`. Users come from the sharee autocomplete (`/ocs/v2.php/apps/files_sharing/api/v1/sharees`), which answers the accounts the caller may address, so the picker needs no admin right and shows nobody the caller cannot already see. Users are listed first and marked with a badge; an empty term searches contacts only, since the autocomplete answers nothing without one.

Each row shows the avatar, display name and primary email. A role dropdown, a validity window and a note describe the link before confirming. Feed `roleOptions` from the schema's vocabulary (the object's contacts listing returns it as `roles`) so the handler picks a declared role rather than typing one.

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
| `roleOptions` | `Array` | Applicant/Handler/Advisor/Other | Role dropdown choices. Pass the schema's `linkRoles` vocabulary here. |
| `includeUsers` | `Boolean` | `true` | Whether Nextcloud users are offered beside contacts. |
| `userSearchUrl` | `String` | `/ocs/v2.php/apps/files_sharing/api/v1/sharees` | The autocomplete the user search reads. |

## Events

| Event | Payload | Description |
| ----- | ------- | ----------- |
| `link` | `{kind, userId \| contactUid + addressbookId + contactUri, displayName, email, role, validFrom, validUntil, note}` | Emitted when the user confirms a selection. `kind` is `user` or `contact`; a user link carries `userId`, a contact link the three CardDAV fields. Dates are `YYYY-MM-DD` or `null`. |
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
