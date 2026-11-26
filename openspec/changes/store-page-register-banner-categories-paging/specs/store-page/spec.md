# store-page: delta for store-page-register-banner-categories-paging

## ADDED Requirements

### Requirement: The board store offers a lens per category

Under the board look, with `categoryLenses` set, the store page MUST show after the All, Installed and Updates available lenses one lens per category the served items carry (`category`, a string or a list of strings), sorted by name, each with the number of items in it. Choosing one MUST show only the items of that category. Without `categoryLenses` no category lens MUST show.

#### Scenario: a register with two categories

- GIVEN a register serving three Intranet items and one Management item
- WHEN the board-look store page opens with `categoryLenses`
- THEN the lenses read All 4, Installed, Updates available, Intranet 3, Management 1
- AND choosing Management shows one card

### Requirement: The board store pages its cards

Under the board look, with `pageSize` set to n, the store page MUST show at most n cards at a time and, when there are more, a pager with Previous, "Page x of y" and Next. Choosing another lens or receiving a new answer MUST return to the first page.

#### Scenario: twenty-three templates, eight per page

- GIVEN a register serving 23 items and `pageSize` 8
- WHEN the page opens
- THEN 8 cards show and the pager reads Page 1 of 3
- AND Next shows the next 8

### Requirement: The board store names the connected register

Under the board look, with `banner` set, the store page MUST show above the lenses the register the items response names (`registry.name`, else its address), its address without the scheme, when it was last checked (`checkedAt`) and whether it answered (Connected, or Not reachable). Whoever may not install MUST read that only administrators install for the whole organisation (or the app's `installNote`). Without a configured register the banner MUST say no register is connected and link to `settingsUrl`, and no lenses or cards MUST show.

#### Scenario: a connected register for a non-administrator

- GIVEN the register "VNG dashboardregister" at https://register.vng.nl/dashboards answered
- WHEN a user who may not install opens the page
- THEN the banner reads VNG dashboardregister, register.vng.nl/dashboards, Last checked and Connected
- AND it says only administrators install for the whole organisation

#### Scenario: no register

- GIVEN no register is configured
- WHEN an administrator opens the page
- THEN the banner says no register is connected and links to the app's settings
- AND no cards and no lenses show

### Requirement: A board store card shows its widgets and its usage

Under the board look a card MUST show, beside its version, the number of widgets (`widgets`) and how many organisations use it (`usage`) when the item reports them, and nothing for either when it does not.

#### Scenario: a template with six widgets used by twelve organisations

- GIVEN an item with `widgets` 6 and `usage` 12
- WHEN its card shows
- THEN the footer reads 6 widgets and Used by 12 organisations
