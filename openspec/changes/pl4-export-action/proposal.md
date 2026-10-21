# pl4-export-action

## Why

pipelinq's operational dashboard carried a report export panel that opened the shared export dialog and then emitted an
event nobody heard, so it showed success and downloaded nothing. A `type: "export"` header action needs an app
handler to do the download, and an app whose records live in OpenRegister has none to write: OpenRegister already
exports objects, as every index page's Export menu shows.

## What changes

- An `export` action without a `handler` downloads OpenRegister objects: the picked entity's `register`, `schema` and
  `filter` (or the action's own `register` and `schema` when it has no picker), in the chosen format, through
  OpenRegister's export endpoint.
- Entity labels run through the app's translate.
- The v2 manifest schema takes `register`, `schema` and `filter` on an export entity (2.139.0).

## Fleet reuse

- pipelinq's operational dashboard export (leads, requests, contact moments, satisfaction scores) is one header action.
- Any dashboard that wants a download of the records behind it, without an app export service.
