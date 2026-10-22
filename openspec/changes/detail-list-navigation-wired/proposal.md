# Proposal: detail-list-navigation-wired

## Why

case-page-and-list-as-a-place (dossiq, REQ-CPL-02) wants a case opened from the queue to offer next and previous within
that queue, with its filters and order. The library has the parts: an index row opens its record with the list context
in the address (`_from`, search, sort, filters), `useListNavigation` turns that context into neighbours, and
CnDetailPage draws the controls from `listNavigation`, `previousTo` and `nextTo`. Nothing passed those props, so a
manifest detail page never showed the controls (dossiq's e2e keeps the scenario as `test.fixme` for this reason).

## What changes

- On a detail page that declares `listNavigation: true` (off by default, so no app starts fetching lists unasked), CnPageRenderer runs `useListNavigation` on the current route, fetching the list the address names: the index page
  `_from` points at, read from OpenRegister's objects endpoint with the address's params. A list with a source of its
  own, or no list named, gives no controls.
- On a detail page whose record sits in that list, CnPageRenderer passes `listNavigation`, `previousTo` and `nextTo` to
  CnDetailPage. A bare link still gets none.

Schema 2.146.0: the page key `listNavigation` (detail pages, default false).
