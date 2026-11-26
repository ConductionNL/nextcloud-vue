# Proposal: workspace-filter-multi-and-clear

## Why

Board PqMijnWerk draws My work's filters as a priority filter that takes several priorities at once, a pipeline filter, a "Filters (N)" count and a "Clear filters" button (pipelinq change `my-work-roadmap`, REQ-MW-200). `CnWorkspaceFilterWidget` writes one value per control and has no count or clear, so pipelinq could offer only one priority at a time.

## What changes

- `multiple: true` on a select control lets it take several options, written comma-joined to the workspace and the address. It is clearable and never picks a first option by itself.
- `clear` on a bar (`{ label?, countLabel? }`) shows how many of its `filter: true` controls are set ("Filters (N)") and a "Clear filters" button that sets them back to their `default`, or empty, in the workspace and the address. Controls without `filter: true` keep their value.
- Without these keys the widget behaves as before.
