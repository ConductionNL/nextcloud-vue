# findRepeatingWrite

Finds the write of a journey that repeats over a list answer: the write whose `forEach` names the answer and that declares `targetBy` and `targets`. Writes without `forEach` never match.

```js
import { findRepeatingWrite } from '@conduction/nextcloud-vue'

const write = findRepeatingWrite(journey.steps, 'producten')
// { targetBy: 'product', targets: { parkeervergunning: { typeValue: 'PV' } } } or null
```

Used with [`CnJourneyReviewList`](../components/cn-journey-review-list.md).

| Parameter | Type | Description |
|-----------|------|-------------|
| `steps` | `Array` | The journey's steps in order, each with an optional `writes` array. |
| `answerKey` | `string` | The list answer's key, matched against each write's `forEach`. |
