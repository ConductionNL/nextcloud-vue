# An object-op's values take the dynamic tokens

## Why

A row action that records when something happened ("Inchecken" on PqEvenement's check-in list: `checkedInAt: "@now"`) saved the literal string "@now". A filter, a payload and a modal's props already fill the dynamic tokens; an object-op's `values` did not.

## What changes

- `object-op` `create` and `patch` fill the dynamic tokens in `values` (`@now`, `@me`, `@objectId`, `@object.<field>`, ...) with the dispatch context, as an `api-call` payload does.
