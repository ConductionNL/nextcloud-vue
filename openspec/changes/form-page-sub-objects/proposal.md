# A form page can ask for a list of objects

## Why
buildiq's journey forms take several products in one request (`forms-multi-product-request` D4, T06): a product list
field stores an array of objects that a repeating write turns into one request per product. CnJourney's review already
lists such answers item by item; the form page itself had no field for them.

## What changes
`cnRenderFormField` (CnFormPage, CnJourney) renders `widget: "sub-objects"`, or an array of objects, with
CnSubObjectsField; CnSubObjectsField takes `maxItems`; a required array needs at least one row. Dutch string added.
