# journey-runtime Delta: journey-repeating-item-review

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [journey-repeating-item-review](../../)

## Purpose

The journey review step shows a list answer item by item, and says what
each item will be filed as when the journey repeats a write over it.
Answers buildiq `forms-multi-product-request`, REQ-BQMP-003, and the
review in its REQ-BQMP-002 scenario. Row `form-multi-product-request`
(buildiq matrix).

## ADDED Requirements

### Requirement: The review lists a list answer item by item

When an answer is an array of objects, the `review` step of `CnJourney`
SHALL show it as an ordered list with the number of items, one block per
item headed by the item's product value (by its option label when it has
one), and each other field of the item as a label and a value. The
product field SHALL be the repeating write's `targetBy` when there is
one, else the first column. Each block SHALL have a Change action that
returns to the step that asked the list, with focus on that item and the
values kept.

#### Scenario: A resident checks two products

- GIVEN a journey whose second step asks the product list `producten` and whose third step is a review
- AND a resident who added a parking permit with licence plate "AB-123-C" and a waste container of 240 litres
- WHEN the resident reaches the review
- THEN the review shows "2 products"
- AND a block "Parkeervergunning" with "Kenteken: AB-123-C"
- AND a block "Afvalcontainer" with "Inhoud: 240 liter"

#### Scenario: A resident corrects one product

- GIVEN the same review
- WHEN the resident chooses Change on "Afvalcontainer"
- THEN the journey returns to the product list step
- AND focus is on the "Afvalcontainer" row with its values intact

### Requirement: The review says what each item will be filed as

When a later step has a write whose `forEach` names the list answer and
which declares `targetBy` and `targets`, the review SHALL say that each
item becomes its own request and SHALL show each item's target type
value. An item whose value has no target SHALL be marked as not fileable
and Submit SHALL be disabled with that reason. Without such a write the
review SHALL show the items only.

#### Scenario: Two products, two case types

- GIVEN a repeating write over `producten` with `targetBy: "product"` and targets `parkeervergunning` to type value `PV` and `afvalcontainer` to `AC`
- WHEN a resident with both products reaches the review
- THEN the review says each product becomes its own request
- AND "Parkeervergunning" shows "Filed as PV"
- AND "Afvalcontainer" shows "Filed as AC"

#### Scenario: An unmapped product stops the submit

- GIVEN a journey edited so that `afvalcontainer` has no target
- WHEN a resident with a waste container reaches the review
- THEN "Afvalcontainer" is marked "This product cannot be filed."
- AND Submit is disabled with that reason
