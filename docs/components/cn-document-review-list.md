# CnDocumentReviewList

Lists files that each need a verdict, and shows how far along you are. Every row has a name, a line of detail, a review status and one action. The line above the list counts the reviewed rows: "2 of 5 reviewed".

It was built for a request under the Dutch Open Government Act (Wet open overheid, Woo), where every document is judged public, partly public or still to review. The status field and its values are yours to configure, so it also fits an attachment check or a contract review.

## Usage

```vue
<CnDocumentReviewList
  title="Review documents"
  :documents="documents"
  @row-action="openDocument" />
```

```js
documents: [
  { id: 1, name: 'Advice on street lighting', meta: 'PDF', reviewStatus: 'public' },
  { id: 2, name: 'Budget note', meta: 'Word, 2 February 2026' },
]
```

A document without a status, or with one the list does not know, gets the first status that is not `reviewed`. With the built-in statuses that is "To review".

### Your own statuses

```vue
<CnDocumentReviewList
  status-field="verdict"
  :statuses="[
    { value: 'approved', label: 'Approved', variant: 'success', reviewed: true },
    { value: 'rejected', label: 'Rejected', variant: 'error', reviewed: true },
    { value: 'open', label: 'Not checked' },
  ]"
  :documents="attachments" />
```

`variant` is a [CnStatusBadge](./cn-status-badge.md) variant. `reviewed: true` counts the row in the progress line.

### As a widget, from the manifest

The `document-review` widget type reads the documents from a field on the record:

```json
{
  "id": "review",
  "type": "document-review",
  "content": {
    "title": "Review documents",
    "field": "documents",
    "statusField": "reviewStatus",
    "rowAction": { "label": "Review", "route": "DocumentDetail" }
  }
}
```

`rowAction.route` opens that route with the row's key as `id`. Without `rowAction` the rows carry no button.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `documents` | Array | `[]` | The documents, one object per row. |
| `title` | String | `''` | Heading of the list. |
| `titleTag` | String | `'h3'` | Element the heading renders as. |
| `nameField` | String | `'name'` | Dot-path to the display name. Falls back to `title`, then `filename`. |
| `metaField` | String | `'meta'` | Dot-path to the line under the name. |
| `statusField` | String | `'reviewStatus'` | Dot-path to the review status. |
| `hrefField` | String | `'href'` | Dot-path to a URL that opens the document. A row that has one shows its name as a link. |
| `rowKey` | String | `'id'` | Dot-path to the value that identifies a row. |
| `statuses` | Array | `[]` | The statuses: `{ value, label, variant?, reviewed? }`. Empty uses public, partly public and to review. |
| `defaultStatus` | String | `''` | Status of a document that carries none. Defaults to the first status that is not `reviewed`. |
| `rowActionLabel` | String | `'Review'` | Label of the row button. An empty string renders no button. |
| `emptyText` | String | `'No documents to review.'` | Shown when there are no documents. |

### Events

| Event | Payload | When |
|-------|---------|------|
| `row-action` | the document | A row's button is pressed. |

### Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `row-action` | `{ document, status }` | Replace the row's button. |

## Accessibility

- The list is a labelled region with a real `<ul>`, so a screen reader announces how many documents there are.
- The status is text in a badge, never a colour alone.
- Each row button is named after its document: "Review: Budget note". A list of five buttons that all say "Review" tells a screen reader user nothing.

## Related

- [CnStatusBadge](./cn-status-badge.md) renders the status.
- [CnDetailPage](./cn-detail-page.md) places the `document-review` widget.
