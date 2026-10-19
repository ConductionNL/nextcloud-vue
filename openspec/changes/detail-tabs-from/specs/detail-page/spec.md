# detail-page Delta: detail-tabs-from

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-tabs-from](../../)

## Purpose

Let a record pick the tabs its detail page shows.

## ADDED Requirements

### Requirement: A record can pick its tabs and their order

With `tabsFrom` set, CnDetailPage SHALL read that field path like a `visibleWhen` field (the record and its `visibilityContext` records). When it resolves to a non-empty list of tab ids, each `tabs` widget on the page SHALL show the tabs whose id (`id`, else `widgetId`, or the string entry) the list names, in the list's order, and SHALL leave the others out; ids that name no tab SHALL be skipped. Any other value, or a list that names none of the widget's tabs, SHALL keep the declared tabs. Edit mode SHALL show every tab, and the declared widget definitions SHALL NOT be changed.

#### Scenario: A tender case

- **GIVEN** a case page with a tabs widget Overview, Files, Submissions, Publications, History and `tabsFrom: "@context.caseType.tabs"`
- **WHEN** the case's type lists `["submissions", "publications", "files", "history"]`
- **THEN** the tabs read Submissions, Publications, Files, History, and a case whose type lists none keeps all five
