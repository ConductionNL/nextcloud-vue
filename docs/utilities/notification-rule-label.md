# notificationRuleLabel

The label a person reads for one notification rule, for example in the user-settings notification pane (`CnNotificationPreferences`). It never returns the raw rule key.

```js
import { notificationRuleLabel } from '@conduction/nextcloud-vue'

notificationRuleLabel(
	{ schema: 'case', notification: 'caseAssigned' },
	{ labels: { 'case.caseAssigned': 'A case is assigned to me' }, language: 'en' },
) // 'A case is assigned to me'

notificationRuleLabel({ schema: 'case', notification: 'caseAssigned' }) // 'Case assigned'
```

| Param | Type | Description |
|-------|------|-------------|
| `entry` | `object` | A preference entry: `schema`, `notification`, and optionally `label`, `title` or `subject`. |
| `options.labels` | `object` | App labels keyed `<schema>.<key>` or `<key>`; values are strings or per-locale maps such as `{ nl, en }`. |
| `options.known` | `object` | Wording for generic keys, keyed by rule key. |
| `options.language` | `string` | The current language, for example `nl` or `de_DE`. Defaults to `en`. |

The first source that has a label wins:

1. the entry's own `label`, then `title` (string or per-locale map);
2. the app's label from `options.labels` (what `CnAppRoot` receives as `notificationLabels`);
3. `options.known`;
4. the entry's `subject`, only when it carries no placeholders;
5. the key made readable by [`humaniseRuleKey`](./humanise-rule-key.md).
