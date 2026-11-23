# grouped-cards-pills-and-counts Delta: grouped-cards-widget

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [grouped-cards-pills-and-counts](../../)

## ADDED Requirements

### Requirement: Groups and cards can carry a status pill

The grouped-cards widget SHALL take `content.groupPill` and `content.itemPill`, each a pill config in the record list's `pill` shape (`field`, `labels`, `colorMap`, `colorField`, `variant`, `variantWhen`, `hideValues`, or `cases`). It SHALL draw the group's pill beside the group title and the card's pill at the card's end. While `itemPill.overdueWhen` (a local condition) holds on a card, its pill SHALL read `itemPill.overdueLabel` in the error tone. `content.itemDate` SHALL be a template drawn before the card's pill. Without these keys nothing changes.

### Requirement: A grouped-cards card can say its counts under its title

`content.headerSubtitle` SHALL be reported to the host card as `header` `{ subtitle }` once the payload is read: a template with `{groups}` and `{items}` (the groups and cards drawn), or `{ parts, separator?, suffix? }` where each part is such a template or `{ count: "groups" | "items", one, other }` in the singular or plural, joined by `separator` (default ", "), with `suffix` after " · ". Without `headerSubtitle` the widget SHALL emit no `header`.
