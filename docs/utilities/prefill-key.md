# PREFILL_KEY

The vendor-extension key a driving property carries to declare that picking it fills OTHER fields of the same form: `'x-openregister-prefill'`.

Where [`EXTENDS_FORM_KEY`](extends-form-key.md) ADDS fields the schema could not enumerate, this one fills fields the schema already declares. A case type knows the status a case of its kind starts in and who normally handles it, so the person filing one should not have to retype either.

```js
import { PREFILL_KEY } from '@conduction/nextcloud-vue'

const declaration = schema.properties.caseType[PREFILL_KEY]
// { fields: { title: 'title', status: 'initialStatus', assignee: 'defaultAssignee' } }
```

`fields` reads as `{ targetProperty: sourceProperty }`, resolved against the chosen record. Two rules keep it safe: only an EMPTY target is written, so a value someone typed survives; and it runs in create mode only, because in edit mode a blank field is a decision someone already made about an existing record.

See [fields the data decides](dynamic-form-fields.md) for the sibling mechanism, and `CnFormDialog` for the dialog behaviour both drive.
