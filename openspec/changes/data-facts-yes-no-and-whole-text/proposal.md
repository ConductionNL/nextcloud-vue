# A data card reads yes/no as a word and shows a long text whole

## Why

The boards draw a yes/no fact as a word ("Ja", "Nee": PqMailinglijst "Openbare aanmelding", eleven Dq boards). CnObjectDataWidget drew a check mark for true and a dash for false, so a false value read as "no value". It also cut every text after 100 characters with "...", so PqMailinglijst's "Omschrijving" stopped mid-word although the cell wraps.

## What changes

- A boolean fact reads "Yes" or "No" (nl "Ja", "Nee"), unless an enum label or an empty-value rule names it.
- A text fact is not truncated; the cell wraps it.
- Tables and other callers of `formatValue` keep their own truncation and check marks.
