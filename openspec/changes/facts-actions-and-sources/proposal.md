---
kind: code
---

# Proposal: facts-actions-and-sources

## Summary

pipelinq draws its POS payment, cash-count and product-supply cards, a ticket's resident preview and a client's
satisfaction card with its own components, because the facts widget could not:

- carry more than one action, or hide an action by the state of the record it shows (a payment's Try again only while it failed);
- read the latest object that matches a query (the last count of a cash shift);
- read an app endpoint the way a stat or chart tile does (`endpointSource`);
- draw rows the server answers (`rowsPath`), or fill an entry from a template ("12 pcs") with a suffix (" kg");
- show a plain number in the reader's language.

The facts widget grows those keys. A page refresh, which an api-call and a saved form already send, makes the facts read
their source again, so an action's result shows on the card.

## Scope

- `src/components/CnFactsWidget/CnFactsWidget.vue`: `actions[]` drawn through CnActionButtons, `source` by `filter` and
  `sort`, `endpointSource`, `emptyWhen`, `rowsPath`, entry `template` and `suffix`, `format: "number"`, reload on the page
  refresh.
- `docs/components/cn-facts-widget.md`.
- No manifest schema change: a facts widget's `content` is not validated field by field.
- A facts card without these keys renders as before.
