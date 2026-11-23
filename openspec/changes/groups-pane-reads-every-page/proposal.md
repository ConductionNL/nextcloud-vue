---
kind: code
---

# Proposal: groups-pane-reads-every-page

## Summary

The groups folder pane (DqAfdelingen) read one page of 200 groups from `cloud/groups/details`. After the 25 Oct reinstall :8080 has 238 groups, and the department groups (`zuiddrecht-…`) come last alphabetically, so the department tree read only "Alles" (compdiff r26c/r26d could not click Vergunningen). `fetchGroups` now reads page after page (`offset`) while a page comes back full, up to 5000 groups.

## Scope

- `src/utils/nextcloudDirectory.js`, a unit test. No schema change.
