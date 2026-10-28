# Proposal: chart-groupby-labels-other

## Why

pl2 PqOperationeel: "Verzoeken per status" showed raw statuses (new, in_progress) and "Verzoeken per categorie" 18 slices with raw slugs; the board draws named rows and the top three plus "Overig". `dataSource.aggregate` has `otherBucket`, the categorical `dataSource.groupBy` had neither words for raw values nor an Other slice.

## What changes

- `groupBy.labels`: a map from a raw value to its words, through the app catalogue (`cnTranslate`); a value without one keeps its key.
- `groupBy.otherBucket`: with `limit`, what falls past it is one "Other" slice.
