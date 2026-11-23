# A files browser row button follows visibleIf.row, and a row field can be tested by a predicate

## Why

dossiq's case documents list (board DqZaakDocumenten) shows "Beoordelen" on every document under review. The case's
own draft decision is listed there too, but it is not a document to assess: the review count ("4 van 7
beoordeeld") already leaves it out, and the button should follow the same rule. The host gives each document under
review a verdict on its row, so the rule is "the row carries a verdict". Two things were missing to say that:

- the row button read `visibleIf` without the file's row, so a `visibleIf.row` on it never held;
- `visibleIf.row` could only compare a field to one exact value, not ask whether the field holds anything.

## What changes

- The row button reads `visibleIf.row` from the file's row, as row actions and side card actions do.
- A `visibleIf.row` entry may be a predicate object instead of a value, with the predicates a form field condition
  already uses (`equals`, `notEquals`, `in`, `notIn`, `truthy`, `falsy`, `empty`, `notEmpty`).
  `{ reviewVerdict: { notEmpty: true } }` holds while the row carries a verdict.

## What does not change

- A plain value is still compared strictly, and a file without a row still does not meet a `row` condition.
- A row button without `visibleIf` is drawn on every file, as before. Hiding is an affordance; the host's endpoint
  still decides.
