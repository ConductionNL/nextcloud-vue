# A copy can start with field values of its own

## Why
stackiq's applications copy must start unpublished: the copy clears `publicationDate` and `depublicationDate` instead
of taking the source's (`applications-copy-with-links` task 2). An index page's copy carried the source's fields and
the new name only.

## What changes
`config.copy.overrides` (CnIndexPage `copy.overrides`) gives every copy field values over the source's, through the
copy endpoint and through the fields-only copy, single and mass. The new name still wins on the name field. The
manifest schema accepts `overrides` on `copySettings`.
