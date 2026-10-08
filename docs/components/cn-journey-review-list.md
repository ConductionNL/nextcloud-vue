# CnJourneyReviewList

The review step's view of a list answer in a journey. An answer that is an array of objects (for example the products a resident asked for) shows as a counted, ordered list with one block per item: the item's main value as a heading, then each other field as a label and a value. When the journey repeats a write over the list, the review also says each item becomes its own request and shows what each one will be filed as.

`CnJourney` (change `journey-runtime`) uses this component for the review step. A host using it directly passes the list answer, the columns from the list field's `items.properties` and the repeating write, and handles `change` and `unfileable`.

## Usage

```vue
<CnJourneyReviewList
  :items="answers.producten"
  :columns="[{ key: 'product', label: 'Product' }, { key: 'kenteken', label: 'Kenteken' }]"
  :heading-options="productOptions"
  :write="findRepeatingWrite(journey.steps, 'producten')"
  @change="({ index }) => goToListStep(index)"
  @unfileable="blocked = $event.length > 0" />
```

`findRepeatingWrite(steps, answerKey)` returns the write whose `forEach` names the answer and that declares `targetBy` and `targets` (or `null`). `journeyItemTargets(items, write)` gives the per-item target type value used by the component.

An item whose `targetBy` value has no entry in `targets` is marked "This product cannot be filed." and listed in the `unfileable` event; keep Submit disabled, with that reason as its description, while the list is not empty.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | Array | `[]` | The list answer: an array of objects. |
| `columns` | Array | `[]` | The details to show, `{ key, label }` from the list field's `items.properties`. Empty: the keys of the first item. |
| `headingField` | String | `''` | Item field used as the block heading. Empty: the repeating write's `targetBy`, else the first column. |
| `headingOptions` | Array | `[]` | Option labels (`{ value, label }`) for the heading field, so a stored value shows by its label. |
| `write` | Object | `null` | The write that repeats over this list (`{ targetBy, targets }`), or null for items only. |
| `itemNoun` | String | `'product'` | Singular noun for the count and the sentence. |
| `itemNounPlural` | String | `'products'` | Plural noun for the count. |
| `headingLevel` | Number | `3` | Heading level of the item headings (one below the step heading). |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `change` | `{ index, item }` | The person chose Change on an item; return to the list step with focus on that row. |
| `unfileable` | `number[]` | Emitted when the set of items with no target changes. Submit should stay disabled while it is not empty. |
