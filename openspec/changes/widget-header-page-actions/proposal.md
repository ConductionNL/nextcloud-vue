# Proposal: widget-header-page-actions

## Why

The boards draw buttons in a card's head that act on the page itself: DqZaaktype "Termijnen" Bewerken edits the case
type, DqZaaktypeOverzicht "Statussen" Bewerken and "Regels" Regel toevoegen open the tab where statuses and rules are
edited. A widget's `headerActions` (24p) dispatch through the page renderer's dispatcher, which cannot open the detail
page's record edit form, and its `navigate` goes through the router, which does not fire the `hashchange` the tab strip
follows. So those buttons could not do something real, and the cards were left without them: live centred no button
where the board draws one, and the title sat 21px down against the board's 27.5px.

## What changes

- `CnDetailPage` provides `cnRecordEdit` (`{ available, open }`): whether the page offers Edit, and its edit form.
- A widget header action `{ type: 'edit-record' }` opens that form, and is left out where the page offers no Edit.
- A widget header action `{ type: 'open-tab', tab }` opens that tab of the page through the `#<tab>` anchor, as a
  `headerLink` with `tab` does.
- `CnDetailWidgetHost` and `CnTabsWidget` pass the page's record edit to the resolver.

No schema change: a detail widget's `headerActions` entries are not validated by the manifest schema.
