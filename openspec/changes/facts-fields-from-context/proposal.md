# A facts card can take its entries from the page context

## Why
A case's request card ("Het verzoek") drew only the case description. A Woo request is about its own scope, period and kinds of documents, which another case type does not have. Which fields the card shows is configuration of the case type, not code.

## What changes
- `content.fieldsFrom`: `@context.<name>.<path>` names a list of entries on a record the detail page reads beside this one (a case type's `requestFields`). When it holds entries, they replace `fields`.
- A template placeholder may name a format: `{path:format}`.
- A new format `year`.
