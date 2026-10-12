# CnAuditTrailWidget

The `audit-trail` widget: a [CnAuditTrailCard](./cn-audit-trail-card.md) that finds its object by itself. The card needs `register`, `schema` and `objectId`; the detail render paths supply the current object in different ways, so the widget reads whichever is present: explicit props first, then the injected object context, then `content`.

The widget registers itself as the `audit-trail` type (a detail-page widget), so a manifest places it by that key. It is also a named export:

```js
import { CnAuditTrailWidget } from '@conduction/nextcloud-vue'
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `register` | `string` | `''` | OpenRegister register slug or id. |
| `schema` | `string` \| `object` | `''` | The schema slug, or the schema object (its slug, name or id is used). |
| `objectId` | `string` | `''` | The audited object's id. |
| `title` | `string` | `''` | Card title override. Defaults to the card's translated label. |
| `maxDisplay` | `number` | `0` | Most audit rows shown. `0` uses the card default. |
| `scope` | `string` | `''` | `object` (default) is one object's trail. `app` lists the app-wide feed, narrowed to `register` / `schema` when set, and needs no object. Also read from `content.scope`. |
| `content` | `object` | `{}` | The stored widget content: `{ title, maxDisplay, scope?, register?, schema?, objectId? }`. |

## Reference (auto-generated)

import GeneratedRef from './_generated/CnAuditTrailWidget.md'

<GeneratedRef />
