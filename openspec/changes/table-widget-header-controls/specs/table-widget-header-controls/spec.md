## ADDED Requirements

### Requirement: a settings or detail table can sort and filter from its column heads

CnWidgetObjectTable with `sortable` and `filterable`, and CnObjectListWidget with `content.sortable` and `content.filterable`, MUST draw the index table's sort and filter controls in their column heads. A header sort or filter MUST be sent with the widget's own fetch, as the index page's parameters. Without the options the heads MUST stay plain labels.

#### Scenario: the connections table on DqInstellingen
- GIVEN the connections table with `sortable` and `filterable`
- WHEN the user sorts on "Bron" descending and filters "Koppeling" on "zaak"
- THEN the fetch carries `_order[source]=desc` and `title[like]=zaak`

#### Scenario: contact moments on DqZaakContact
- GIVEN the case's contact moments with `content.filterable`
- WHEN the user filters "Samenvatting" on "gebeld"
- THEN the list fetches again with `summary[like]=gebeld`
