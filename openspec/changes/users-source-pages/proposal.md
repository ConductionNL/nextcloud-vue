---
kind: code
---

# Proposal: users-source-pages

## Summary

DqAfdelingen pages a department's staff ("4 van 18", page buttons) and sorts them from the table heads. The `users` index source handed the page every member at once, with no pager and no order. It now declares `pages`, `searchParam: "search"` and a `sortParam`: it reads a group's members (and their presence) once, then searches, sorts and pages them itself, so a new page, term or order asks the server nothing.

## Scope

- `src/composables/indexSources.js` (usersSource, membersPage), tests. No schema change.
