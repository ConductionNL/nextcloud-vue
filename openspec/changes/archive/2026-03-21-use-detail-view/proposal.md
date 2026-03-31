# useDetailView Specification

## Problem
`useDetailView(objectType, id, options?)` is a composable exported by `@conduction/nextcloud-vue` that provides reactive object data, save/delete operations, loading state, and optional post-operation router navigation for detail/edit views. It eliminates the boilerplate that was previously duplicated across every detail-view component.
---

## Proposed Solution
Implement useDetailView Specification following the detailed specification. Key requirements include:
- Requirement: objectStore integration
- Requirement: id parameter accepts both plain strings and Vue refs
- Requirement: auto-fetch on mount and id change
- Requirement: loading state
- Requirement: edit mode toggle

## Scope
This change covers all requirements defined in the use-detail-view specification.

## Success Criteria
- object is read from store
- new object returns empty object
- isNew is false for existing objects
- missing or falsy id is treated as new
- plain string id is normalized to ref
