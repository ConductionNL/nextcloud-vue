# CnSelectionScope

Says in words which "all" a bulk act will take: the rows ticked on this page, or every row matching the search. Widening to the whole result and going back are two explicit buttons, never a side effect of the header checkbox.

The whole-result offer is withheld when `total` is unknown (0, null or not a number), or when it is no larger than the ticked rows. Offering "select all 400" without knowing there are 400 is the surprise this exists to prevent.

## Usage

```vue
<CnSelectionScope
  :selected-ids="selectedIds"
  :total="matchingTotal"
  :scope="scope"
  :labels="{ page: t('myapp', '{count} cases on this page are selected.') }"
  @update:scope="scope = $event" />
```

The component emits; it never switches itself. The host keeps the scope and builds the selection it hands the job: the ids for `page`, the search for `result`.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `selectedIds` | Array | `[]` | The ticked rows |
| `total` | Number | `0` | How many rows match the search; 0 or null when unknown |
| `scope` | String | `'page'` | `'page'` or `'result'` |
| `labels` | Object | `{}` | Templates replacing the pluralised library wording: `page`, `result`, `widen`, `narrow`, with `{count}` (ticked) and `{total}` (matching) |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:scope` | `'page'` or `'result'` | The reader widened or narrowed the selection |

## Test ids

`bulk-selection-scope`, `bulk-selection-sentence`, `bulk-selection-widen`, `bulk-selection-narrow`.
