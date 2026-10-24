# operatorTakesValue

Whether a condition operator needs a value. Only `present` ("is filled in") does not, so the editor hides the value field for it.

```js
import { operatorTakesValue } from '@conduction/nextcloud-vue'

operatorTakesValue('present') // false
operatorTakesValue('eq')      // true
```
