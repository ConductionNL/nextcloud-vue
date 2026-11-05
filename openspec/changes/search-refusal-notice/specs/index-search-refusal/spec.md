# search-refusal-notice Delta: index-search-refusal

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [search-refusal-notice](../../)

## ADDED Requirements

### Requirement: A refused search can keep the rows and say so under the search field

CnIndexPage SHALL take `searchRefusal` (`config.searchRefusal`, `{ title?, after? }`). While it is set and a self-fetch search is refused (400 with a position, as `readSearchRefusal` reads it), the page SHALL keep the rows and pagination it had and draw, first among its notices above the list, an alert (`variant: error`, `role: alert`) titled `title` with `{position}` (default "Search term not understood at position {position}:") whose text is the server's message followed by `after` (default "The list is not filtered; adjust the term."). Without `searchRefusal` the refusal SHALL replace the rows as before.

### Requirement: The search page says a refused term under its field

When a `sources` search of CnSearchPage is refused for its grammar (400 with a position), the page SHALL keep that source's previous results and draw the same alert under the search field, with its `searchRefusal` words when given. A search that is not refused SHALL clear the alert.
