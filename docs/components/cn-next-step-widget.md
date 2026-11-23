# CnNextStepWidget

The `next-step` widget: a [CnNextStepCard](./cn-next-step-card.md) for the bound record's stage. It draws the checklist only; the page's own primary button stays where the page puts it. It renders nothing when the stage declares no card.

The widget registers itself as the `next-step` type, so a manifest places it by that key. It is also a named export:

```js
import { CnNextStepWidget } from '@conduction/nextcloud-vue'
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | `{ field?, title?, stages: { <stage>: { title?, checklist, after? } } }`. `field` names the record's stage field. |
| `objectData` | `object` | `null` | The bound record. |

## Reference (auto-generated)

import GeneratedRef from './_generated/CnNextStepWidget.md'

<GeneratedRef />
