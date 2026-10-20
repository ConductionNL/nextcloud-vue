# open-form-endpoint

## Why

`open-form` only created register objects: it fetched a register schema and saved through the object store. A record
that is not a register object, such as an OpenRegister organisation, could not be edited from a page, although
OpenRegister updates one with `PUT /api/organisations/{uuid}`. Board dossiq/DqTenant draws "Bewerken" in an
organisation's header.

## What changes

- An `open-form` action with `endpoint: { url, method?, loadUrl?, responsePath? }` and `formProperties` (JSON-schema
  properties) is an edit form: CnActionButtons reads the record from `loadUrl` (else `url`), shows CnFormDialog with the
  declared fields filled in, and sends those fields back to `url` with PATCH (default) or PUT, then toasts and refreshes
  the page. A record that cannot be read toasts and opens nothing; a refused save shows the server's message in the dialog.
- The manifest schema accepts `endpoint` and `formProperties` on an action (2.135.0).
