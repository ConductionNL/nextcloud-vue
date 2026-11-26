# Proposal: store-page-register-banner-categories-paging

## Why

Board LpStore (LaunchPad's marketplace) draws what CnStorePage cannot show yet: a banner for the connected register
("VNG dashboardregister, register.vng.nl/dashboards, last checked today 06:00, Connected") with the note that only
administrators install for the whole organisation; after All, Installed and Update available, one lens per category
the register's items carry, each with its count; cards that show the number of widgets and how many organisations use
the template; and 8 cards per page. The kind lenses (`kindLenses`) are a fixed list from the manifest, so they cannot
follow the categories a register serves.

## What changes

Under the board look only, all opt-in, so every store page renders as before unless it sets the new config:
- `categoryLenses: true`: one lens per `card.category` (a string or a list), sorted, with counts;
- `pageSize: <n>`: the cards page n at a time with a Previous / Page x of y / Next pager; another lens or a new answer starts at page 1;
- `banner: { settingsUrl?, settingsLabel?, installNote? }`: the register from the items response (`registry: { name, url }`), its address, Last checked and Connected / Not reachable; the install note for whoever may not install; without a register a "no register is connected" line with a link to `settingsUrl` replaces the cards and the lenses;
- a card's `widgets` and `usage` counts show in its footer when the register reports them.

## Impact

`src/components/CnStorePage/CnStorePage.vue`, `l10n/en.json`, `l10n/nl.json`, a new test
`tests/components/CnStorePageRegisterBanner.spec.js`. First consumer: launchpad store-page-board-sync.
