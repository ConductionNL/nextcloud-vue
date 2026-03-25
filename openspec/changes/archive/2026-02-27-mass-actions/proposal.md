# Mass Actions

## Problem
Each Nextcloud app implements its own mass action dialogs and row action menus, leading to inconsistent UX and duplicated logic across apps.

## Solution
Provide 4 reusable mass action dialogs (delete, copy, export, import), a CnMassActionBar that appears when items are selected, and CnRowActions for inline + overflow action rendering.

## Commit
- 49649fb (2026-02-27)
