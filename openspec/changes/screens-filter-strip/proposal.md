---
kind: code
---

# Proposal: screens-filter-strip

## Summary

Board PqWachtrij narrows the queue twice: the kind in the quick filter tabs, then the channel in a second strip of
pills with counts ("Soort, dan kanaal"). An index page had one quick-filter strip. `filterStrip` adds a second one on
one field, with counts within the active quick filter.

## Scope

- `src/components/CnIndexPage/CnIndexPage.vue`: `filterStrip`, its pills, counts and pick.
- `src/css/index-page.css`: the pills (34px, radius 17, the active one in ink).
- Manifest schema 2.92.0: `pages[].config.filterStrip`.
- Without the key nothing changes.
