# store-page

## ADDED Requirements

### Requirement: The list narrows to the items that fit the active target

When `activeTarget` names a target, directly or through a `@workspace.<key>` token, the store page SHALL show only the
items that fit it: items the engine reports installed nowhere, installed without a target, or installed into that
target. The page SHALL show the filter as "Fits: {target}" with the target's label, and SHALL show every item again
when the user clears it. Without an active target, or with a token that resolves to nothing, the page SHALL show every
item and no filter.

#### Scenario: a bundle installed only into another world is hidden

- GIVEN targets "De Zuiderlanden" (w1) and "Nevelkust" (w2), and the active world w1
- AND the search answers `installed: { skills: ["w1"], theme: ["w2"], templates: [""] }` with an uninstalled `spells`
- THEN the page shows skills, templates and spells, and not theme
- AND the filter reads "Fits: De Zuiderlanden"

#### Scenario: the user clears the filter

- WHEN the user clears the filter
- THEN every item shows again and the filter is gone

#### Scenario: no active world

- GIVEN `activeTarget` is `@workspace.activeWorld?` and the workspace has no active world
- THEN every item shows and no filter is drawn

### Requirement: The install picker starts on the active target

When the active target is one of the targets, the install picker SHALL start on it; a target the user picks SHALL win.

#### Scenario: installing into the active world by default

- GIVEN targets w1 and w2, and the active world w2
- WHEN the administrator installs an item without touching the picker
- THEN the install body carries `target: "w2"`
