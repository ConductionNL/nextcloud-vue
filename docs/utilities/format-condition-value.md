# formatConditionValue

A condition's stored value as a reader sees it, formatted by its field (`type`, `format`, `options`): a choice by its option label, a currency as money, a date as a date.

```js
import { formatConditionValue } from '@conduction/nextcloud-vue'

formatConditionValue(100000, { type: 'number', format: 'currency' }) // "€ 100.000" in a Dutch locale (EUR unless the field names a `currency`)
```

[`conditionSentence`](./condition-sentence.md) uses it for the value part of a clause.
