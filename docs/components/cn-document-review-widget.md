# CnDocumentReviewWidget

The `document-review` widget: a [CnDocumentReviewList](./cn-document-review-list.md) fed from a list on the bound record, in a bordered card.

The widget registers itself as the `document-review` type, so a manifest places it by that key. It is also a named export:

```js
import { CnDocumentReviewWidget } from '@conduction/nextcloud-vue'
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | `{ field, title?, nameField?, metaField?, statusField?, hrefField?, rowKey?, statuses?, defaultStatus?, emptyText?, rowAction?: { label, route } }`. `field` is the dot path to the documents on the record (default `documents`). A `rowAction` with a `route` opens that route with the row's key as `id`; without a `label` there is no button. |
| `objectData` | `object` | `null` | The bound record. |

## Reference (auto-generated)

import GeneratedRef from './_generated/CnDocumentReviewWidget.md'

<GeneratedRef />
