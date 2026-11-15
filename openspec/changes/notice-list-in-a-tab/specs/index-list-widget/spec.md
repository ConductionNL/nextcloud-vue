# index-list-widget Delta: notice-list-in-a-tab

## ADDED Requirements

### Requirement: A list in a tab hands its Actions menu to the tab strip

An `index-list` widget inside a tab panel SHALL publish its Actions menu entries (Import, Export, Copy selected, Delete selected, less those its content turns off with `showMassImport`, `showMassExport`, `showMassCopy` or `showMassDelete`) to the tab strip's menu, and SHALL draw no Actions menu of its own. Each entry SHALL run on the list. A selection entry SHALL be drawn disabled while no row is selected. When the widget goes, its entries SHALL go with it. Outside a tab panel the list SHALL keep its own menu.

#### Scenario: the notices tab
- GIVEN the portal page's Mededelingen tab holding an `index-list` of the portal's notices
- WHEN the tab is open and the user opens the strip's Acties menu
- THEN it lists Importeren, Exporteren, Selectie kopiëren and Selectie verwijderen after the strip's own entries
- AND the list draws no Acties button above its table

### Requirement: A list in a detail page opens its rows on their page

An `index-list` widget whose content names `rowRoute` (a route name taking the row's `id`) SHALL link each row to that route and open it on a click, in a new tab for a modified click, as a list page does. Without `rowRoute` a row click SHALL do what it did.

#### Scenario: a notice opens its page
- GIVEN the Mededelingen tab's list with `rowRoute` "NoticeDetail"
- WHEN the user clicks the notice "Het Stadskantoor is gesloten"
- THEN the notice's page opens
