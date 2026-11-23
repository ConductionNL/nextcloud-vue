# Tasks: menu-counts-follow-changed-objects

- [x] 1.1 `CnAppRoot` reads the filtered menu counts of a changed register and schema again on `cn:objects-changed`, and stops listening on unmount.
  - `tests/components/CnAppRootMenuItemCounts.spec.js`: the queue badge goes from 2 to 1 after the signal and the count of another schema is not read again; no read after unmount. Control: the first fails on the shell without the listener.
