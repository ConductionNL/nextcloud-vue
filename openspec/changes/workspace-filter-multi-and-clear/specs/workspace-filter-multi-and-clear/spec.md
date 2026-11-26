# workspace-filter-multi-and-clear Specification (delta)

## Purpose

A page filter bar can hold a filter with several values and tells the user how many filters are set, with one way back to the unfiltered page.

## ADDED Requirements

### Requirement: A workspace-filter select can take several values

A select control with `multiple: true` SHALL let the user pick several options and SHALL write them comma-joined to its workspace key and its address key. It SHALL read several values back from the address, dropping unknown ones, and SHALL NOT pick a first option by itself.

#### Scenario: Urgent and high
- GIVEN a priority select with `multiple: true`
- WHEN the user picks Urgent and High
- THEN the workspace holds `urgent,high`

### Requirement: A bar counts and clears its filters

A bar with `clear` SHALL show, while any of its `filter: true` controls is set, how many filters are set ("Filters (N)", each value of a multiple select counting once) and a "Clear filters" button. The button SHALL set every filter control back to its `default`, or empty, in the workspace and the address, and SHALL leave other controls as they are.

#### Scenario: Clear filters
- GIVEN My work filtered to tickets, urgent priority and one pipeline, sorted newest first
- WHEN the user chooses Clear filters
- THEN all types, all priorities and all pipelines are shown again
- AND the sorting stays newest first
