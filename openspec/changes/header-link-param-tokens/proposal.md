# header-link-param-tokens

## Why

A widget's `headerLink` can name a route, but its `params` were passed as written: a card could not link to the page
its record names. The case type's phase board (board dossiq/DqZaaktype) has "Bekijken als flow", which opens the
case type's workflow (`caseType.workflowDefinition`).

## What changes

- A header link's `params` and `query` resolve `@objectId` and `@object.<path>` against the page's record, in the tab
  strip and on a stacked card.
- A link whose route params do not all resolve is not drawn.
