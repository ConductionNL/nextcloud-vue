# Design: journey-repeating-item-review

Read at nextcloud-vue development `3e606bf10`, buildiq's
`forms-multi-product-request` change on buildiq development, and
OpenRegister's `or-form-and-journey-registry` change on openregister
development.

## What is there

- `CnJourney` is specified, not built. `src/` has no `CnJourney`,
  `CnJourneyDialog` or journey store. The open change `journey-runtime`
  specifies the review step: it "SHALL display the answers from every
  preceding step, grouped by step, with a way to return to the step
  that produced each"
  (`openspec/changes/journey-runtime/specs/journey-runtime/spec.md:87-90`).
  It says nothing about a list answer.
- The `sub-objects` widget is specified, not built. Its value is "array
  of objects; columns come from `items.properties`"
  (`openspec/changes/form-widgets-duration-and-subobject-table/design.md:35`),
  and it is selected by `x-widget: sub-objects` or a field override
  (`:17`).
- The manifest `formField` def defers `items`
  (`src/schemas/app-manifest.schema.json:888`), while the v2 schema's
  `config.fields[]` items are open objects
  (`src/schemas/app-manifest-v2.schema.json:2831-2848`), so a v2 form
  field can carry `items`.
- OpenRegister's journey declares per-step `writes[]` of
  `{ register, schema, mapping }` (openregister
  `openspec/changes/or-form-and-journey-registry/specs/form-and-journey-registry/spec.md:40-46`).
  `forEach`, `targetBy` and `targets` are buildiq's design D1 and D2,
  owed by OpenRegister.

## Decisions

### D1. A list answer is a list of blocks

When an answer is an array of objects, the review renders it with
`CnJourneyReviewList`: an ordered list with one block per item and a
count above it ("2 products"). The block heading is the value of the
item's product field, shown by its option label when the field offers
`{ value, label }` options. The product field is `targetBy` when a write
names it, else the first column. Under the heading each other column is
a label and a value, labels from the field's `items.properties` titles
(the key when a title is missing). An empty list says "Nothing chosen."

Rejected: a table with a column per detail. The journey renders on
phones (`journey-runtime` names the portal a mobile surface), and a
six-column table does not fit one.

### D2. What each item becomes, when the journey says

The review looks through the journey's later steps for a write whose
`forEach` equals this answer's key. When that write has `targetBy` and
`targets`, the list gets the sentence "Each product becomes its own
request." and each block gets "Filed as" with the item's target
`typeValue`. When no such write exists, the list shows items only.

An item whose `targetBy` value has no entry in `targets` is marked "This
product cannot be filed." and Submit is disabled with that reason.
Buildiq refuses an unmapped value at save, so this is a guard for a
journey edited elsewhere.

Rejected: sending the list to OpenRegister for a dry run. The review
already has the journey object, and a dry run would need an endpoint
that does not exist.

### D3. Change returns to the item

Each block has a Change link. It returns to the step that asked the
list, as `journey-runtime` requires for any answer, and moves focus to
that item's row in the list field. The values stay as they were.

## Files

- `src/components/CnJourney/CnJourneyReviewList.vue`: new.
- `src/components/CnJourney/CnJourney.vue`: the review step renders
  list answers through it and reads the repeating write.

## Accessibility

The items are an ordered list; each heading is a heading one level below
the step heading. Change links name the item ("Change Parkeervergunning").
The "cannot be filed" mark is text, not colour alone, and the disabled
Submit has the reason as its description.

## Theming

Blocks use `--color-background-hover` with `--color-border`, and the
mark uses `--color-error`. No hard-coded colours.
