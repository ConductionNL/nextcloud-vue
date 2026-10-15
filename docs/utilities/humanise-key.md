# humaniseKey

Turns an identifier-shaped key into readable sentence-case words, so a person never reads the raw identifier. Splits camelCase, snake_case, kebab-case, dot.separated and space-separated keys, keeps acronyms, and capitalises only the first word. Pure: no Vue, no store, no fetch. [`humaniseRuleKey`](./humanise-rule-key.md) delegates to it.

```js
import { humaniseKey } from '@conduction/nextcloud-vue'

humaniseKey('fooBar') // 'Foo bar'
humaniseKey('object_created') // 'Object created'
humaniseKey('newBRPRecord') // 'New BRP record'
humaniseKey('nl-description') // 'Nl description'
```

| Param | Type | Description |
|-------|------|-------------|
| `key` | `string` | The key to make readable, such as an object property name. |

Returns the readable label, or the key itself (as a string) when it holds no words. A missing key (`null`, `undefined`) returns an empty string.
