# Proposal: criteria-summary-reads-filter-labels

## Why

DqFilterBewerken on :8080 (24 Oct, r25b): under "Keep what is saved" the edit dialog read "Wacht op inwoner ja, status
verborgen in lijsten nee, concept nee, is een eindstatus nee." The side panel and the Active line already honour the
page's `filterLabels` (hidden working-list rules, a filter's label and value words); the edit dialog's criteria
sentences did not, because `criteriaSummaryOf` never passed them.

## What changes

`criteriaSummaryOf` hands `filterLabels` to `viewCriteriaSummary`, which already reads them.
