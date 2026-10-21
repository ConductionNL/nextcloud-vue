# pl4-index-row-api-call

## Why

pipelinq keeps three export list pages custom only for a row button that posts to the app's endpoint (Test
connection, Retry, Enable/Disable). The index page's row actions navigated or opened a modal, but could not call an
endpoint; the `api-call` action existed for header actions only.

## What changes

- An index row action of `type: "api-call"` runs the shared api-call for the picked row (`{objectId}` and `{field}`
  row tokens in the url, toasts) and reads the list again after a success.

## Fleet reuse

- pipelinq export jobs, runs and destinations; any list with a per-row server action.
