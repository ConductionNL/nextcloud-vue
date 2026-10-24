## ADDED Requirements

### Requirement: The criteria sentences read the page's filter labels

The edit dialog's criteria sentences SHALL leave out a filter the page's `filterLabels` marks `hidden`, and SHALL name a
filter and its values by its `filterLabels` entry when one is given.

#### Scenario: A working-list rule and a labelled flag
- GIVEN filterLabels `statusHiddenInLists: { hidden: true }` and `waitingOnApplicant: { label: "Status", values: { true: "waiting on the applicant" } }`
- WHEN a view filters `waitingOnApplicant: true, statusHiddenInLists: false`, sorted by deadline ascending
- THEN the sentences read "Status waiting on the applicant. Sorted by deadline, ascending."
