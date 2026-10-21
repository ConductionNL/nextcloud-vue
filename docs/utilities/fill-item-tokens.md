# fillItemTokens

`fillItemTokens(value, scope, key?)` fills `@<root>.<path>` tokens in an action from the row it is drawn on, such as `@item.id` on a week view item or `@group.offerId` on a grouped card. `scope` names the roots: `{ item, group }`.

- A string that is exactly one token takes the value as it is, with its type: `"props": { "session": "@item" }` hands a dialog the whole row, `"href": "@item.joinUrl"` a whole link, `"payload": { "free": "@item.free" }` a number.
- Inside a longer `url`, `target` or `href` a value is URL-encoded.
- A missing value fills as an empty string inside a longer string, and as `null` when the string is the token alone.

```js
import { fillItemTokens } from '@conduction/nextcloud-vue'

fillItemTokens({ url: '/apps/x/api/lessons/@item.id/notes', props: { lesson: '@item' } }, { item: row })
```
