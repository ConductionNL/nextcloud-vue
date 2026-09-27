---
kind: code
depends_on: [journey-runtime]
---

# Proposal: journey-repeating-item-review

## Why

A resident asks for a parking permit and a waste container in one
request. Buildiq lets a maker build that as a journey: the resident
fills a product list, and each product becomes its own request with its
own case type. Before submitting, the resident checks what they asked
for. The journey renderer, `CnJourney`, has a review step that shows
every answer grouped by step. It says nothing about a list answer. A
list of products would show as one opaque value, and the resident could
not see that two separate requests are about to be filed.

## Rows

The requesting change is buildiq `forms-multi-product-request`. Its
proposal, section "Sibling halves", names this half:

> nextcloud-vue: the list field and the review. It owes the
> `sub-objects` form widget (open change
> `form-widgets-duration-and-subobject-table`, none of its tasks
> checked at `c8aa858`) and a review step in `CnJourney` that lists each
> product with its details.

Its tasks.md, T06: "File the widget half with nextcloud-vue: the
`sub-objects` widget (`form-widgets-duration-and-subobject-table`) and a
per-item review in `CnJourney`. Verify: the nextcloud-vue changes cite
REQ-BQMP-003." Its REQ-BQMP-002 scenario "Two products, two case types"
ends: "the preview's review shows one request per product with its case
type". Its design D1 and D2 give the shape the review reads: a write
with `forEach` naming the list answer, `targetBy` naming the item field,
and `targets` mapping each value to `{register, schema, typeValue}`.

This change covers only the review. The `sub-objects` widget is the open
change `form-widgets-duration-and-subobject-table` and is not specified
again here. `CnJourney` and its review step are the open change
`journey-runtime`, which this change extends.

Rows the requesting change covers:

| matrix | row | name |
|---|---|---|
| buildiq | `form-multi-product-request` | Request several products or services in one submission, each starting its own process. |

## What changes

- The review step shows a list answer as one block per item: the item's
  product as a heading, then each detail with its label.
- When a later write repeats over that list with a target per item, each
  block says what it will be filed as, and the list says each product
  becomes its own request.
- Each block has a Change link that returns to the step that asked the
  list, with focus on that item's row.
- An item whose value has no target is marked, and Submit says why it
  cannot go ahead.

## Affected projects

- `nextcloud-vue`: `CnJourney`'s review step, a new `CnJourneyReviewList`.
- Consumers: buildiq journeys and their designer preview, portaliq,
  which hosts journeys.

## Backward compatibility

`CnJourney` is not built yet; this change adds to its specification.
Answers that are not lists of objects render as `journey-runtime`
specifies.

## Out of scope

- The `sub-objects` list field itself (`form-widgets-duration-and-subobject-table`).
- Committing one write per item, recording each item's outcome and
  retrying a failed item. Those are OpenRegister's, per the buildiq
  change.
- A confirmation that lists what each item became after submit. The
  buildiq change leaves the confirmation to the host.

## Cross-project dependencies

- OpenRegister's journey schema must carry `forEach`, `targetBy` and
  `targets` on a write (buildiq T05). The open change
  `or-form-and-journey-registry` declares writes as `{ register, schema,
  mapping }` only. Until it carries them, the review still lists items
  but names no targets.
- The buildiq product list needs two things the open change
  `form-widgets-duration-and-subobject-table` does not specify: a row
  limit (`maxItems`, default 10, at most 25, buildiq design D4) and a way
  for a manifest form field to declare the columns. That change reads
  columns from a schema's `items.properties`, and the manifest
  `formField` defers `items`. Both belong in that change, not here.
