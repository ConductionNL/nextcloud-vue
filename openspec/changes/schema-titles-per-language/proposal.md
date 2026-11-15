# A field is named in the reader's language

## Why
OpenRegister keeps a property's name per language in `titles` beside `title` (`modelling-field-names-per-language`,
design D-1), and asks the library to prefer `titles[<user language>]` in forms and table headers (task 3.3). The
library read `title` only, so a Dutch reader saw the English name.

## What changes
`utils/propertyTitle.js`: `titles[<language>]`, then the base language, then `title`, then the key, with the reader's
Nextcloud language by default. `columnsFromSchema`, `fieldsFromSchema`, the filters, and the components that name a
property themselves (CnObjectCard, CnInfoWidget, CnSubObjectsField, CnChildRecordsField, CnIndexPage labels,
transition inputs, the presentation picker, useChildRecords) use it. A schema without `titles` reads as before.
