# Navigation & Schema Utilities

## Problem
Each app builds its own index page layout, navigation components, and schema-to-column parsing logic, resulting in duplicated boilerplate and inconsistent layouts.

## Solution
Provide CnIndexPage as a zero-config page component that assembles sub-components (header, actions bar, sidebar, view mode toggle). Add schema utilities (columnsFromSchema, filtersFromSchema, formatValue) to auto-generate table config from JSON Schema.

## Commits
- 03eb4d0 (2026-02-27)
- db51241 (2026-02-27)
