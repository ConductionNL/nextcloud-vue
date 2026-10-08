# humaniseRuleKey

Turns a notification rule key into readable sentence-case words, so a person never reads the raw identifier. Splits camelCase, snake_case and kebab-case, keeps acronyms, and capitalises only the first word. It is the last fallback of [`notificationRuleLabel`](./notification-rule-label.md).

```js
import { humaniseRuleKey } from '@conduction/nextcloud-vue'

humaniseRuleKey('caseAssigned') // 'Case assigned'
humaniseRuleKey('object_created') // 'Object created'
humaniseRuleKey('newBRPRecord') // 'New BRP record'
```

| Param | Type | Description |
|-------|------|-------------|
| `key` | `string` | The rule key from a schema's `x-openregister-notifications` map. |

Returns the readable label, or the key itself when it holds no words.
