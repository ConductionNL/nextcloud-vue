# navigationApps

The apps in the reader's Nextcloud navigation, in its order: `{ id, label, href, icon }` for every entry with a name and a link. The navigation is read once per page load from the OCS navigation endpoint with the reader's session, so it holds only the apps the reader may open. A failed read gives an empty list.

## Import

```js
import axios from '@nextcloud/axios'
import { navigationApps } from '@conduction/nextcloud-vue'

const apps = await navigationApps(axios)
```

## Signature

```ts
function navigationApps(axios: object): Promise<Array<{ id: string, label: string, href: string, icon: string }>>
```
