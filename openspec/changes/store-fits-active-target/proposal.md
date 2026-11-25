# The store list narrows to the items that fit the active target

## Why
larpinq's store board (LrStore, admin-configuration-store REQ-ACS-003) draws an active filter "Past bij: De Zuiderlanden"
above the cards, and installs default to the active world. CnStorePage knew the targets an install can go into
(`store-install-target`) and where each item is installed (`store-installed-in`), but not which target is active.

## Decision
An item fits a target unless the engine reports it installed only into other targets: an item installed nowhere, or
installed without a target (it serves every target, like sheet templates drawn "Geïnstalleerd in alle werelden"), or
installed into that target fits. Reason: the board's filtered list holds both an uninstalled bundle (Sciencefiction
basisregels) and one installed in the active world, and hides content that belongs to another world. Items carry no
other "fits" metadata today, so this is the narrowing the data supports; it is reversible.

## What changes
- CnStorePage takes `activeTarget` (`config.activeTarget`): a target id or a `@workspace.<key>` token (trailing `?`
  allowed), read from the injected `cnWorkspaceContext`.
- With an active target the list starts narrowed to the items that fit it, shown as "Active: Fits: {target}" with a
  "Clear all" button; the lens chips keep counting every item, as the board draws "Alle 14" beside "6 van 14".
- The install picker starts on the active target instead of the first target.
- Without `activeTarget`, or when it resolves to nothing, the page behaves as before.
- "Fits: {target}" in en and nl ("Past bij: {target}").
