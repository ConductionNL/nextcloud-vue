# Tasks: named-source-header-filters

- [ ] 1.1 Test (red first): on the tasks source, the Status, Priority, Deadline and Subject (filterField objectUuid) headers carry a funnel, Task and Handler do not; choosing a state writes the sidebar's `state` filter; a deadline range is written as `dueAt: { from, to }` and the month default shows the Deadline funnel active.
- [ ] 1.2 CnDataTable `filterSchema`.
- [ ] 1.3 CnIndexPage wiring for `headerFilters: "searchFields"`.
- [ ] 1.4 tasks source `headerFilters: "searchFields"`.
- [ ] 1.5 dossiq: Tasks columns `filterField` (subjectLabel → objectUuid, priorityLabel → priority).
- [ ] 1.6 Live: DqTaken header funnels on :8080.
