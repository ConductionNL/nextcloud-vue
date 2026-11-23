# index-export-menu Delta: index-header

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-export-menu](../../)

## ADDED Requirements

### Requirement: An Export header button can be a menu of formats

A `headerButtons` entry with `action: "export"` and `menu: [{ format: "csv" | "excel", label, description? }]` SHALL be drawn as a menu button with the Export label and icon: one entry per known format, its label bold and its description muted under it, each running the page's export in that format; the button's `note` SHALL close the menu as a muted line. Labels go through the host translate. Without `menu` the Export button SHALL stay as it was.

### Requirement: Header buttons can differ per view

CnIndexPage SHALL take `headerButtonsByView` (`config.headerButtonsByView`), `{ table?, cards?, list?, board?, map? }`, each a list as `headerButtons`. While the open view has an entry and no scope declares its own `headerButtons`, that list SHALL be drawn instead of `headerButtons`.
