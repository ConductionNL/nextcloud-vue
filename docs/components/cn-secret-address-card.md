# CnSecretAddressCard

Make, show once, copy, reset and remove a secret address: a URL with a token that works without an account, such as a personal calendar feed, a hall screen's page or a webhook URL. The server keeps only a hash of the token, so the address is shown once, right after it is made; a reset makes a new one and the old one stops working.

Use it in a settings section, or with `dialog` as the target of an `open-modal` action.

## In the user settings dialog

```vue
<template #user-settings-sections>
	<NcAppSettingsSection id="calendar-feed" :name="t('myapp', 'Calendar subscription')">
		<CnSecretAddressCard
			status-url="/apps/myapp/api/timetable/feed"
			create-url="/apps/myapp/api/timetable/feed"
			revoke-url="/apps/myapp/api/timetable/feed"
			address-path="url"
			:extra-links="[{ path: 'webcalUrl', label: 'Open in your calendar app' }]"
			:texts="{ intro: 'Add this address to your calendar app to see your lessons there.' }" />
	</NcAppSettingsSection>
</template>
```

## As an open-modal action

Register it as a modal (`{ kind: 'modal', component: CnSecretAddressCard }`) and open it from a detail page:

```json
{
  "id": "screen-address", "label": "Screen address", "type": "open-modal", "target": "ScreenAddress",
  "props": {
    "dialog": true, "title": "Screen address", "objectId": "@objectId",
    "createUrl": "/apps/myapp/api/display-screens/{objectId}/token",
    "revokeUrl": "/apps/myapp/api/display-screens/{objectId}/revoke", "revokeMethod": "POST",
    "addressPath": "address"
  }
}
```

## Props

| Prop | Type | Default | Meaning |
|------|------|---------|---------|
| `statusUrl` | String | `''` | GET; whether an address exists, read at `statusPath` (default `exists`). Without it the card learns it on the first create. |
| `createUrl` | String | required | Makes a new address (`createMethod`, `POST` or `PUT`); an earlier one stops working. |
| `addressPath` | String | `url` | Where the create answer holds the address. |
| `extraLinks` | Array | `[]` | `[{ path, label }]` links read from the create answer. Only http(s), mailto, same-origin paths and webcal(s) are drawn. |
| `revokeUrl` | String | `''` | Removes the address (`revokeMethod`, `DELETE` or `POST`), after a confirm. Without it there is no remove button. |
| `objectId` | String | `''` | Put in place of `{objectId}` in the urls. |
| `texts` | Object | `{}` | `intro`, `hint`, `exists`, `revoked`, `shownOnce`, `revokeQuestion`, and the labels `addressLabel`, `createLabel`, `resetLabel`, `revokeLabel`, `copyLabel`; each through the host's translations, library defaults for the rest. |
| `dialog` | Boolean | `false` | Draw the card in its own dialog named `title`. |
| `title` | String | `''` | The dialog's name. |

## Events

| Event | When |
|-------|------|
| `close` | Dialog mode: the dialog was closed. |
