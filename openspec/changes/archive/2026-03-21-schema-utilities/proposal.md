# Schema Utilities — Spec

## Problem
Specifies the utility functions that auto-generate table columns, form fields, and filter definitions from JSON Schema properties, plus helper utilities for value formatting, HTTP headers, query strings, and error parsing.
**Files**: `src/utils/schema.js`, `src/utils/headers.js`, `src/utils/errors.js`, `src/utils/id.js`
---

## Proposed Solution
Implement Schema Utilities — Spec following the detailed specification. Key requirements include:
- Requirement: REQ-SU-A01 — Performance with Large Schemas
- Requirement: REQ-SU-A02 — Barrel Export Completeness

## Scope
This change covers all requirements defined in the schema-utilities specification.

## Success Criteria
- Basic column generation
- Filtering
- Column overrides
- Enum and items passthrough
- Type-based default widths
