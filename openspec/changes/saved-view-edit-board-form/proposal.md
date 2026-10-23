# The saved-view edit dialog draws the board's form

## Why

DqFilterBewerken draws the edit form with "Naam" as a label above its field,
and the criteria as two choice cards. Each card says what the view would hold:
the saved criteria, or the list's current search term, filters and sort. In the
board look the dialog drew Nextcloud's floating label and two bare radios with
no summary.

## What changes

- In the board look, CnSavedViewEditDialog draws the name with its label
  outside and above the field, and the criteria as CnChoiceCards rows. Each row
  carries its summary (`savedSummary`, `currentSummary`).
- `viewCriteriaSummary(state)` writes a view's filters, search term and sort as
  sentences, for example "Status wacht op inwoner. Sorted by deadline,
  descending."
- CnIndexPage passes both summaries, read against the page schema's titles.
- The Nextcloud look keeps its form.
