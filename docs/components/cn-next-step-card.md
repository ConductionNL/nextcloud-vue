# CnNextStepCard

Shows what a record needs now, next to the button that does it. A short checklist for the current step, one primary action and a line about what follows. Use it at the top of a case, an application or an order, where a handler should not have to search a menu for the next step.

The card renders nothing when it has no checklist. A step that needs no explaining shows no empty card.

## Usage

```vue
<CnNextStepCard
  title="What now? Step 2: handling"
  :items="[
    { label: 'Receipt confirmed', done: true },
    { label: 'Review the open documents', hint: '2 of 5 done' },
    { label: 'Draft the decision' },
  ]"
  action-label="Continue reviewing"
  after="Then: step 3, decision"
  @action="onContinue" />
```

The first item that is not done is shown in bold. That is the one to pick up.

### On a detail page, from the manifest

`CnDetailPage` renders the card above the body from `config.nextStep`. The card follows the record's stage, and the page's primary button moves into it.

```json
{
  "type": "detail",
  "config": {
    "stageField": "status",
    "nextStep": {
      "stages": {
        "in_behandeling": {
          "title": "What now? Step 2: handling",
          "after": "Then: step 3, decision",
          "checklist": [
            { "label": "Confirm receipt", "doneField": "receiptConfirmedAt" },
            { "label": "Review the documents", "doneWhen": { "field": "openDocuments", "op": "eq", "value": 0 } },
            { "label": "Draft the decision", "doneField": "decision" }
          ]
        }
      }
    }
  }
}
```

An item is done when `doneField` holds a value on the record, or when `doneWhen` is true. `doneWhen` takes the same condition as `visibleWhen` on an action. A stage without an entry shows no card.

### As a widget

The `next-step` widget type renders the same checklist inside a detail grid or side column, without the button:

```json
{ "id": "what-now", "type": "next-step", "content": { "stages": { "open": { "checklist": [{ "label": "Assign a handler", "doneField": "assignee" }] } } } }
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | `''` | Heading of the card. |
| `titleTag` | String | `'h3'` | Element the heading renders as. Pick the level that fits the page outline. |
| `items` | Array | `[]` | The checklist: `{ label, done?, hint? }` per item. |
| `actionLabel` | String | `''` | Label of the primary button. Empty renders no button. |
| `actionId` | String | `''` | DOM id for the primary button, so a skip link can land on it. |
| `actionDisabled` | Boolean | `false` | Disable the primary button, for example while its request runs. |
| `after` | String | `''` | One line under the button that says what follows. |
| `doneLabel` | String | `'Done'` | Text state of a done item, read by screen readers. |
| `todoLabel` | String | `'To do'` | Text state of an open item, read by screen readers. |

### Events

| Event | Payload | When |
|-------|---------|------|
| `action` | none | The primary button is pressed. |

### Slots

| Slot | Description |
|------|-------------|
| `action` | Replace the primary button with your own control. |

## Accessibility

- The card is a labelled region, named by its heading.
- Every item says "Done" or "To do" in text. The marker is a shape and a colour, and neither reaches a screen reader.
- The button is a native button, reachable with Tab and operable with Enter and Space.

## Related

- [CnDetailPage](./cn-detail-page.md) renders this card from `nextStep`.
- [CnStagesWidget](./cn-stages-widget.md) shows where the record is. This card says what to do there.
