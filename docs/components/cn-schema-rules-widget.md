---
sidebar_position: 12
---

# CnSchemaRulesWidget

The rules OpenRegister's engine holds for one schema, in the order it evaluates them: each rule's kind (from the engine's own vocabulary, so a kind added later still renders), whether it is on, and when it last ran. A trial runs one rule against one stored object, writes nothing, and shows the trace: the verdict, the operand it read and what it found. The inventory is an admin read, so a refusal is said in a sentence instead of an empty table.

It reads `/apps/openregister/api/rules/vocabulary`, `/apps/openregister/api/schemas/{schema}/rules` and posts to `…/rules/{id}/evaluate`. A rule is addressed by its whole id, never by its position.

Manifest widget type: `schema-rules` (detail pages), with the props below as `content`.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `register` | String | required | The register the trial object lives in |
| `schema` | String | required | The schema whose rules are listed |
| `objectId` | String | `''` | The object a trial runs against, pre-filled; the reader can change it |
| `title` | String | `''` | The heading; `null` draws none (a card that already carries a title) |
| `description` | String | `''` | The line under the heading |
| `emptyText` | String | `''` | Said when the schema has no rules |
| `objectLabel` | String | `''` | The label of the trial object field |
| `objectPlaceholder` | String | `''` | Its placeholder |
| `refusedText` | String | `''` | Said when the inventory is refused (403) |
| `disabled` | Boolean | `false` | Read nothing yet (a record still being created) |

Declared texts go through the host's `cnTranslate`.

## Example

```json
{ "id": "rules", "type": "schema-rules", "title": "Rules", "content": { "register": "myapp", "schema": "case", "objectId": "", "title": null } }
```
