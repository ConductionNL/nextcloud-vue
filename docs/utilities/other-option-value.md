# OTHER_OPTION_VALUE

The value a transition select input holds when the user picks its "Other" entry (`other: { label, input }`), so the host can read the input the "Other" entry names instead.

```js
import { OTHER_OPTION_VALUE } from '@conduction/nextcloud-vue'

const teacher = values.substituteTeacherId === OTHER_OPTION_VALUE ? values.otherTeacherId : values.substituteTeacherId
```

[readTransitionInputs](./read-transition-inputs.md) does this for the inputs it reads.
