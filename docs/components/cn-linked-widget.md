# CnLinkedWidget

One card that lists what other apps hold for a record, as the case page's "Gekoppeld" card draws it (board DqZaak). It is the `linked` widget.

- `content.leaves` names the mount-mode integration leaves, in the order to list them.
- Each leaf is mounted out of sight with an `onSummary(summary)` prop and reports `{ count, noun, rows?, actions? }`.
- A leaf with something linked draws its rows. A row is `{ label, href?, run?, icon? }`: a link when it has `href`, a button when it has `run`.
- The leaves with nothing linked share one line ("Leges, contract en projecten: niets gekoppeld"), followed by their actions. The nouns are joined as a sentence list in the user's language.
- A leaf whose app is not installed is not registered, so it is left out without a gap.
- The rows and actions read as the board's links, and the empty line keeps its muted size under a theme.

## Usage

```json
{
  "id": "linked",
  "type": "linked",
  "title": "Gekoppeld",
  "content": { "leaves": ["shillinq-fees", "contracts", "projects"] }
}
```

On a detail page the widget host passes the record's `objectId`, `register` and `schema`.

## Content

| Key | Description |
|-----|-------------|
| `leaves` | The integration ids of the mount-mode leaves to list, in order |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | Object | `{}` | The configuration above: `{ leaves: string[] }` |
| `objectId` | String \| Number | `''` | The record's id, handed to each leaf |
| `register` | String | `''` | The record's register, handed to each leaf |
| `schema` | String | `''` | The record's schema, handed to each leaf |

## A leaf's summary

A leaf calls `onSummary` whenever what it holds changes:

```js
onSummary({
  count: 2,
  noun: 'leges',
  rows: [{ label: 'Leges 2026-0082', href: '/apps/shillinq/fees/82' }],
  actions: [{ label: 'Leges toevoegen', run: () => openFeeDialog() }],
})
```

A summary with `count: 0` puts the leaf's `noun` in the shared "nothing linked" line and its actions after it.
