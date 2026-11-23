# CnStatusList

A short list of items, each a link with a detail line, an optional due date and a status pill, with an optional row of counts per status above it. It fetches nothing: a widget for work packages, cases or wiki pages brings the data, and this draws it the same way.

A due date before today on an item that is not `done` reads as overdue, in the error colour.

## Usage

```vue
<CnStatusList
	:items="[{ id: '1', title: 'Bouwvergunning', href: '/apps/dossiq/cases/1', meta: 'Z-2026-001', due: '2026-11-30', status: { label: 'In behandeling', variant: 'purple' } }]"
	:counts="[{ key: 'open', label: 'In behandeling', count: 1, variant: 'purple' }]"
	empty-label="No cases assigned to you" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `Array` | `[]` | `{ id, title, href?, external?, meta?, due?, done?, status?: { label, variant? } }`. An `external` link opens in a new tab. |
| `counts` | `Array` | `[]` | `{ key, label, count, variant? }`, drawn above the items. |
| `loading` | `Boolean` | `false` | Whether the items are being read. |
| `error` | `String` | `''` | A message that replaces the items when the read failed. |
| `emptyLabel` | `String` | `''` | What an empty list says. |
| `today` | `String` | `''` | The day overdue is measured against, `YYYY-MM-DD`; empty is today. |

`variant` is one of the [`CnStatusBadge`](./cn-status-badge.md) variants.

## Slots

| Slot | Props | Description |
|------|-------|-------------|
| `actions` | `{ item }` | Controls at the end of a row, such as a favourite toggle. |
