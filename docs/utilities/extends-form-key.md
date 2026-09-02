# EXTENDS_FORM_KEY

The vendor-extension key a driving property carries to declare that picking it brings further fields with it: `'x-openregister-extends-form'`.

```js
import { EXTENDS_FORM_KEY } from '@conduction/nextcloud-vue'

const declaration = schema.properties.caseType[EXTENDS_FORM_KEY]
```

See [fields the data decides](dynamic-form-fields.md) for the block's shape and the behaviour it drives.
