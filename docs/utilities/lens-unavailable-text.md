# lensUnavailableText

Turns personal-lens reports into the short explanation a list shows instead of its generic empty text, when a lens could not answer. [`CnIndexPage`](../components/cn-index-page.md) and [`CnDataTable`](../components/cn-data-table.md) use it for their empty states.

## Signature

```js
import { lensUnavailableText, readLensReports } from '@conduction/nextcloud-vue'

const text = lensUnavailableText(readLensReports(body), {
	'recent.audit-trail-disabled': t('dossiq', 'This server does not keep track of which cases you open.'),
})
```

| Argument | Type | Description |
|----------|------|-------------|
| `reports` | `object \| null` | The reports, see [`readLensReports`](./read-lens-reports.md). |
| `overrides` | `object \| null` | App text keyed `<lens>.<reason>` or `<reason>`. Optional. |

Returns the text for the first lens with `available: false` and a reason there is text for, or `''` when there is none. On `''` the caller keeps its own empty text.

## Text

App text wins over the built-in text, and `<lens>.<reason>` wins over `<reason>`. The built-in text exists for the `recent` lens only and is object-neutral:

| Reason | English | Dutch |
|---|---|---|
| `audit-trail-disabled` | This server does not keep track of what you open. | Deze server houdt niet bij welke items je opent. |
| `anonymous` | Log in to see what you opened recently. | Log in om te zien wat je onlangs opende. |
| `read-history-unavailable` | Your recent items are not available right now. | Je recente items zijn nu niet beschikbaar. |

An unknown reason, or a lens without text, gives `''`. Another lens (`watching`) that starts reporting needs only text in `overrides`.
