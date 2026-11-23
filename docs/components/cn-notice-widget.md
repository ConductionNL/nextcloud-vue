# CnNoticeWidget

A toned notice box: an icon, a bold title and a line of text in one rounded box. Board DqSociaalDomein draws one in the case's side column: "**Bijzondere persoonsgegevens: gezondheid.** Elke inzage wordt gelogd met het doel." Widget type `notice`, usable in a detail page's side column, its body grid, and on a dashboard.

The surface applies the widget's `visibleWhen`, so a notice can show only for the records it concerns, for example a case whose type holds special-category data.

## Usage

```json
{
  "id": "special-data",
  "type": "notice",
  "content": {
    "variant": "warning",
    "title": "Special category data: health.",
    "text": "Every view is logged with its purpose."
  },
  "visibleWhen": { "field": "@context.caseType.specialCategories", "op": "notEmpty" }
}
```

Place it in a detail page with `config.sideColumn: ["special-data", …]`.

```vue
<CnNoticeWidget :content="{ variant: 'info', text: 'Read-only while the case is suspended.' }" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | Object | `{}` | `{ variant?, role?, layout?, title?, text, icon?, link?, actions?, dismissible? }`. `variant` is `info` (default), `warning`, `error` or `success`, each with its own tone and icon. `title` (bold) and `text` go through the app's translate. `icon` names a CnIcon instead of the variant's own. Without `title` and `text` nothing renders. |
| `objectData` | Object | `null` | The page's record, for `@object.<field>` in the link. |
| `objectId` | String \| Number | `''` | The page's record id, for `@objectId` in the link. |
| `inline` | Boolean | `false` | Draw it as a card's state banner: the tighter board inset (10px 14px, radius 10) and a `status` / `alert` role. Set by [CnCardNotices](./cn-card-notices.md). |

## Events

| Event | Payload | When |
|-------|---------|------|
| `action` | `{ key, label, variant, action }` | A notice button was pressed (its action is dispatched too). |
| `dismiss` | none | The close button was pressed. |

## A link to a record

`link` puts a link under the text: `{ route, params?, label, fallbackLabel? }` for a route name, or `{ href, label }`. `@objectId` and `@object.<field>` in `params` and `label` read the page's record. A link whose params do not resolve is left out; a label that does not resolve takes `fallbackLabel` (translated), else "Open". On a task page, the case a flow run waits on:

```json
{ "id": "side-waiting", "type": "notice", "visibleWhen": { "field": "runUuid", "op": "notEmpty" },
  "content": { "icon": "CheckboxMarkedCircleOutline", "title": "A case is waiting on this task", "text": "Complete the task and the case moves on.",
    "link": { "route": "CaseDetail", "params": { "id": "@object.objectUuid" }, "label": "@object.subjectLabel", "fallbackLabel": "Open the case" } } }
```

The box is `role="note"`, named by its title, unless `role` says otherwise.

## A state banner in a card

Inside a card the same content is the card's state banner (R1): an engine refusal, a partial result, a source that is down, a success. See [CnCardNotices](./cn-card-notices.md) for where it goes.

| Key | Meaning |
|-----|---------|
| `role` | `status`, `alert` or `note`. Inside a card it defaults to `alert` for `error`, `status` for the rest; as a widget it stays `note`. |
| `layout` | `inline` (default): the bold title, then the text on the same line. `stacked`: the title on its own line above the text (DqZaakLocatie, DqWerkbord). |
| `actions` | `[{ label, action, variant? }]`: buttons after the text, each dispatching a manifest action through the page dispatcher (`@objectId`, `@object.<path>` resolved). `variant` is `link` (default, a text button), `secondary` or `primary`. |
| `dismissible` | `true` draws a close button ("Close"). |

`{path}` in `title` and `text` is filled from the record (`{actor.name}`); a path the record does not hold reads empty.

```json
{ "variant": "success", "title": "2 cases moved to In progress.", "text": "1 case moved without all of its automatic actions.",
  "actions": [{ "label": "View failed actions", "action": { "type": "open-modal", "target": "FailedSideActions" } }] }
```

A `banner` draws a Nextcloud note card meant for a full-width row: in a side column it nests a second box and has no title. Use `notice` there.
