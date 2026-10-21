# CnGroupedCardsWidget

Groups of cards side by side, read from an app endpoint. Registered under the `grouped-cards` widget type, for detail
pages and dashboards.

The board DqZaaktype ("Fasen en taken") draws each phase of a case type as a grey panel with its task cards (title,
role, lead time) and closes the grid with a dashed box of the acts available in every phase. dossiq answers that shape
at `GET /api/case-types/{id}/phases`; the widget is generic and reads any payload of groups with items.

## Content shape

```json
{
  "id": "case-type-phase-board",
  "type": "grouped-cards",
  "title": "Phases and tasks",
  "content": {
    "endpointSource": { "url": "/apps/dossiq/api/case-types/@objectId/phases" },
    "groupsPath": "phases",
    "itemsKey": "tasks",
    "groupTitle": "Phase {order}: {name}",
    "groupCount": { "one": "{count} task", "other": "{count} tasks" },
    "itemTitle": "{title}",
    "itemMeta": ["{candidateGroups}", "{leadTimeDays} working days"],
    "columns": 2,
    "extraGroup": { "title": "Always available", "path": "alwaysAvailable", "itemText": "{label}", "join": " · " },
    "emptyText": "This case type has no phases yet"
  }
}
```

| Key | Meaning |
|---|---|
| `endpointSource` | `{ url, params?, responsePath? }`, tokens such as `@objectId` resolve as on every widget. |
| `groupsPath` | Where the list of groups sits in the payload (default `groups`). |
| `itemsKey` | The list of cards in each group (default `items`). |
| `groupTitle`, `itemTitle` | Templates (`{path}` tokens, as in a record list). |
| `itemMeta` | A template, or a list joined with " · "; a part whose token is empty is left out. A part `{ count, one, other }` is the number at the card's `count` path in the singular or plural text, `{count}` filled in ("1 free place", "3 free places"). |
| `groupCount` | `{ one, other }` with `{count}`: a count pill in the group header. |
| `extraGroup` | `{ title, path, itemText, join? }`: a dashed box of entries read at `path`, on one line. |
| `columns` | Groups side by side (1 to 4, default 2); one column on a narrow screen. |
| `emptyText`, `groupEmptyText`, `errorText` | The texts of an empty grid, an empty group and a failed read. A failed read offers Try again. |
| `groupLines` | Templates drawn under a group's title, each left out when it does not fill. An entry `{ text, when }` is drawn only when the local condition `when` (`{ field, op, value }`, `all` / `any`) holds on the group. |
| `itemActions` | Actions on every card, drawn as CnActionButtons draws them (`api-call`, `open-form`, `navigate`, ...). `@item.<path>` and `@group.<path>` in their strings read the card and its group: URL-encoded in `url`, `target` and `href`; a string that is exactly one token takes the value with its type. `visibleWhen` is the local condition over `item.<path>` and `group.<path>`, so Join, Move here and Leave each show when they apply. |
| `groupProgress` | `{ valuePath, label? }`: a progress bar of the group's value (0 to 100) at `valuePath`, `label` filled from the group. |
| `heading` | A template filled from the payload, drawn as a heading above the groups when the widget is a page of its own (`{name}` of an offer). |
| `extraItemsKey`, `extraItemsHeading` | A second list of each group under its own heading (who did not sign up, the courses still to do). `extraItemTitle`, `extraItemMeta` and `extraItemActions` work as for the cards; a plain string entry reads as `{ value }`. |
| `itemFlag` | `{ field, label }`: a card whose `field` is true carries `label` ("Overdue") in the error colour. |
| `itemsPath`, `itemGroupField` | Read the cards from one flat list of the payload: a card joins the group whose `id` its `itemGroupField` names. |
| `ungroupedTitle` | With `itemsPath`, the group of the cards that name no group. Without it they are left out. |

A template, or a part of `itemMeta`, may be a list of candidates: the first that fills (`["{provider.name}", "No provider recorded"]`).

A language map (`{ "nl": "Ontvangst", "en": "Intake" }`) reads in the user's Nextcloud language, then Dutch, then
English. A list of plain values reads joined with ", ". Every text goes through the app's translate.

## Accessibility

Each group is a `section` named by its heading, its cards a list, so a screen reader announces "Phase 1: Intake, 2
tasks" before the cards.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `content` | `Object` | `{}` | The configuration above. |
| `objectId` | `String\|Number` | `null` | The record id, for the `@objectId` token. |
| `objectData` | `Object` | `null` | The record, for `@object.<field>` tokens. |
