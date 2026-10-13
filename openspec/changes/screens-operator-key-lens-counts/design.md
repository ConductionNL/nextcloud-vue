# Design: screens-operator-key-lens-counts

- A key ending in `[op]` (letters and underscores between the brackets) is an operator key.
- `singleEqualityOf` returns null for an operator key: it is a comparison, not a field to group on.
- `needsListEndpoint` is true for a filter with an operator key, so `fetchFilterCounts` counts it with
  `fetchListTotal` (one `_limit=1` list request, `total`). A base filter with an operator key sends every entry there.
- `fetchListTotal` already sends a flat key as it is, exactly as the page's own list request does.
- Other entries keep their grouped or value request.
