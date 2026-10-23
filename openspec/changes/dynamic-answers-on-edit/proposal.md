---
kind: code
---

# Proposal: dynamic-answers-on-edit

## Summary

`x-openregister-extends-form` renders a record's data-driven questions on the
edit form, but every one opens empty (or at the definition's default): nothing
reads the answers the record already stores. And on save only the open-form
create path writes the answers back; the detail page and index page edit forms
drop them silently. A dossiq case edited from its page therefore shows none of
its case-type answers and loses any answer the person changes.

## What changes

For a declaration that stores its answers on the parent (`values.mode: "array"`):

- `CnFormDialog` editing a record fills each question with the answer stored in
  the record's `values.arrayKey` array, typed for its field (number, boolean,
  JSON for a list or object). A stored answer wins over the definition default.
- On confirm the dialog folds the answers into its payload's `arrayKey`, merged
  over the record's stored array: a changed answer replaces its entry, an
  unchanged one keeps its stored entry as it was, a cleared one is removed, and
  entries for questions the form did not ask stay. Every consumer of the dialog
  (CnDetailPage, CnIndexPage, a `form-dialog` slot replacement) saves them with
  no change of its own.
- `CnActionButtons` folds with the same merge, so its create path is unchanged.

The child-record shape (`values.schema` rows) is not covered here.
