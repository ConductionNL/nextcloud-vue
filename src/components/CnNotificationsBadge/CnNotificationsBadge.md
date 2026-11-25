# CnNotificationsBadge

The signed-in user's unread Nextcloud notifications of one app, as a count in a page header that opens their list.

It reads the notifications OCS API (`GET /ocs/v2.php/apps/notifications/api/v2/notifications`) and keeps the entries
whose `app` is `appId`, newest first. The list shows each one's icon, summary, relative time and link. A notification is
unread until it is dismissed, so opening one dismisses it (`DELETE …/notifications/{id}`), lowers the count and then
follows its link. With nothing unread, or without the notifications app, it draws nothing. It reads again on
`cn:page:refresh`, so a page's Refresh and `autoRefresh` keep the count current.

On a dashboard page it is `config.notificationsBadge`: `true` for the page's own app, or another app id.

```vue
<CnNotificationsBadge app-id="pipelinq" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `appId` | String | (required) | The app whose notifications count (`app` on each notification). |
