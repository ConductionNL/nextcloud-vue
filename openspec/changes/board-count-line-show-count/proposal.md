---
kind: code
---

# Proposal: board-count-line-show-count

## Summary

In the board look an index page always drew the default "{shown} of {total}" line under its title, and `showCount: false` only dropped the actions bar count. DqAfdelingen's board has no count line (the folder heading already says how many staff). A board page with `showCount: false` and no count template of its own now leaves the default line out; a page's countText or countSubtitle still shows.

## Scope

- `CnIndexPage.vue` headerDescriptionBase, a jest test.
