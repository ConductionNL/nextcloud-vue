# notificationCountsByApp

The reader's notifications counted per app id, read once per page load from the Notifications app. Without that app, or on a failed read, it gives an empty object.

## Import

```js
import axios from '@nextcloud/axios'
import { notificationCountsByApp } from '@conduction/nextcloud-vue'

const counts = await notificationCountsByApp(axios) // { mail: 2, spreed: 1 }
```

## Signature

```ts
function notificationCountsByApp(axios: object): Promise<Record<string, number>>
```
