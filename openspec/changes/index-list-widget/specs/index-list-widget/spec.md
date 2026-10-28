## ADDED Requirements

### Requirement: A detail page can hold a list page's list

The `index-list` widget SHALL render a list page's list (lenses, search, view switch, filters, selection, pager) for `content.register` and `content.schema`. Its base filter SHALL be `content.filter` with the page record's tokens filled in. Every other `content` key that a list page takes SHALL be passed on as given. The list SHALL NOT load while a token in its filter has no value.

#### Scenario: an event's registrations
- GIVEN an event page whose Aanmeldingen tab holds an `index-list` of `eventRegistration` filtered on `{ event: "@objectId" }`, with status lenses
- WHEN the tab opens
- THEN the tab lists that event's registrations, with the lenses, the search and the pager of a list page

### Requirement: An embedded list leaves the address alone

A CnIndexPage with `routeState` false SHALL NOT write its filters, search, sort or saved view into the address. The `index-list` widget SHALL set it false.

#### Scenario: searching in a tab
- GIVEN the Aanmeldingen tab's list
- WHEN the user searches "Lindelaan"
- THEN the list narrows and the detail page's address does not change
