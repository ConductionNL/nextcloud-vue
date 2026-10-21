# CnBannerWidget

A notice for dashboards and pages. It renders a themed note card with a severity, a text, an optional click-through route and an optional `visibleWhen` condition. With `layout: "attention"` it renders an attention card: a card with a severity edge, a kicker, a title, a reason line and actions.

The widget registers itself as the `banner` dashboard widget type, so a manifest places it with `widgetKey: "banner"`. It is also a named export, for an app component that draws the card itself and passes the props directly:

```js
import { CnBannerWidget } from '@conduction/nextcloud-vue'
```

Before this export existed, a named import resolved to `undefined`. Vue then rendered an unknown `<cnbannerwidget>` element and the grid kept an empty cell for it. An app that cannot import it yet can read the same component from the widget registry with `getWidgetTypeEntry('banner').renderer`.

For the manifest keys and the attention card see the [dashboard widget catalog](./dashboard-widget-catalog.md#banner-and-attention-card--banner).

## Props

| Prop | Type | Description |
|------|------|-------------|
| `variant` | `'info' \| 'warning' \| 'error' \| 'success'` | The severity. Empty falls back to `content`, then `info`. |
| `text` | `string` | The banner text. Empty falls back to `content`. |
| `lead` | `string` | A bold lead before the text; `{value}` is filled like in `text`, and it goes through the app's translate (as `text` does). Empty falls back to `content`. |
| `icon` | `string` | A named icon (`AccountPlus`, ...) drawn before the text instead of the variant's glyph. Empty falls back to `content`. Under the board look the first of `actions` is drawn as a link at the end of the line. |
| `visibleWhen` | `object \| null` | The visibility condition. `null` shows the banner always. |
| `route` | `string \| object \| null` | A route name or location. When set, the text is a link. |
| `layout` | `'' \| 'banner' \| 'attention'` | The note card (default) or the attention card. |
| `kicker` | `string` | Attention card: the label above the title. |
| `title` | `string` | Attention card: the title. Falls back to `text`. |
| `reason` | `string` | Attention card: the line that says why it needs attention. |
| `actions` | `Array` | Attention card: the actions. |
| `maxActions` | `number \| null` | Attention card: the most actions shown. |
| `stacked` | `boolean` | Attention card: the actions under the text, with a 16px title. |
| `content` | `object` | The stored content blob; flat props win on collision. |
| `objectData` | `object \| null` | The record of the page the banner sits on, as a detail host binds it. A local `visibleWhen` reads it when no `cnObjectContext` is provided. |
| `conditionOutcome` | `object \| null` | A verdict a host already evaluated, so the banner does not fetch again. Its `row` is the first row of an ordered `visibleWhen.source`, the card's subject (`{subject.title}` in the texts, `@subject.id` in an action route). |

## The record as the subject

A `visibleWhen` with only a `field` (no `endpoint`, no `source`) is decided on the page's own record, and that record is
the card's subject. An `endpoint` may name the record (`@objectId`, `@object.<field>`); its whole answer is then the
subject. When a subject token has no value, the whole line is empty, so `fallbackText`, `fallbackLead` and
`fallbackReason` say the shorter sentence instead:

```json
{
  "type": "banner",
  "content": {
    "icon": "ArchiveOutline",
    "lead": "This item is archived. {subject.@self.archived.by} filed it on {subject.@self.archived.at|date}. You can read it, and changes are refused.",
    "fallbackLead": "This item is archived. You can read it, and changes are refused.",
    "text": "{subject.@self.archived.reason}",
    "visibleWhen": { "field": "@self.archived", "op": "notEmpty" }
  }
}
```

A `visibleWhen.source` may carry `extend` (OpenRegister `_extend[]` names), so a card that names the first row of a query
can also name what that row points at (`{subject.caseType.title}`).

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `action` | `{ id, label, index }` | An attention-card action with neither `route` nor `href` was clicked. |

## Reference (auto-generated)

import GeneratedRef from './_generated/CnBannerWidget.md'

<GeneratedRef />
