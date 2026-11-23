# A select over another app's list falls back to text when that app is missing

## Why
dossiq's case type stores an IV3 taakveld code picked from Shillinq's `BbvTaakveld` catalogue. Without Shillinq the
read fails and the field says the list "could not be loaded", which reads as an error, not as a missing app.

## What changes
An `optionsFrom` block (and `x-options-from`) takes `requiresApp` and `missingText`. While the app is missing the
source is not read; the field is a text input that stores the typed value, with `missingText` under it. The manifest
schema accepts both keys.
