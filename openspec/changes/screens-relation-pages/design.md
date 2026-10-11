# Design: screens-relation-pages

## The boards compared

Eleven boards, four screen types. "Pq" is pipelinq, "Dq" dossiq, "Sh" shillinq.

| Screen type | Boards |
|---|---|
| List of persons | PqContacten (contact persons at a customer), DqContacten (residents from the BRP) |
| Person detail | PqKlant (resident), DqContact (resident), PqContactpersoon (contact person at a customer) |
| List of organisations | PqOrganisaties, DqOrganisaties, ShLeveranciers (suppliers) |
| Organisation detail | PqOrganisatie, DqOrganisatie, ShKlant (customer) |

### Person and organisation detail: one anatomy

PqKlant, DqContact, PqOrganisatie and DqOrganisatie are the same page. ShKlant
and PqContactpersoon share its frame (header, tabs, data card, side column,
History last) and differ in their cards.

**Header** (board look, two rows):

| Part | PqKlant | DqContact | PqOrganisatie | DqOrganisatie | ShKlant | PqContactpersoon |
|---|---|---|---|---|---|---|
| Title | name | name | trade name | trade name | name | name |
| Type pill | Inwoner | Inwoner | Vereniging (legal form) | Vereniging | Klant | Contact |
| Second pill | 1 open ticket | 1 lopende zaak | none | none | Ook leverancier | none |
| Breadcrumb | Inwoners en bedrijven / name | Contacten / name | Organisaties / name | Organisaties / name | Klanten / name | Contacten / name |
| Meta line | address | address | 2 open tickets | 1 lopende zaak | klant sinds 2019 · openstaand EUR | role bij organisation |
| Quick actions | Contact vastleggen, Nieuw verzoek | Contact vastleggen, Nieuwe zaak | Contact vastleggen, Nieuw verzoek | Contact vastleggen, Nieuwe zaak | Nieuwe factuur | Bellen, Mail |
| Then | Bewerken, buildiq, Meer | same | same | same | same | same |

**Under the header** (PqKlant and PqOrganisatie only): an attention line
("Geen waarschuwingen bij deze inwoner. Waarschuwing toevoegen") with a row of
contact buttons (Bellen, Mail, Route, Bezoek vastleggen, Bericht sturen), then
six KPI tiles (Openstaande zaken, Nieuwe verzoeken, Termijn verstreken, Termijn
in gevaar, Open leads, Laatste activiteit).

**Tabs** (folder tabs with counts, Actions at the end, History last):

| Board | Tabs |
|---|---|
| DqContact | Overzicht, Zaken 2, Tickets 2, Contactmomenten 3, Bestanden 4, Historie 9 |
| PqKlant | Overzicht, Zaken, Tickets, Contactmomenten, Verkoop, Documenten, Geschiedenis |
| DqOrganisatie | Overzicht, Zaken, Tickets, Contactpersonen, Contactmomenten, Documenten, Historie |
| PqOrganisatie | Overzicht, Zaken, Tickets, Contactpersonen, Contactmomenten, Documenten, Geschiedenis |
| ShKlant | Overzicht, Facturen 24, Abonnementen 3, Incasso, Herinneringen, Historie 31 |
| PqContactpersoon | Overzicht, Deals, Verzoeken, Contactmomenten, Boekingen, Relaties, Abonnementen, BSN en BRP, Kanalen, Mail, Berichten, Afspraken, Bestanden, Geschiedenis (14) |

**Overview tab**, top to bottom:

1. The record's data card in the tab panel: "Inwoner"/"Contact" (Naam,
   Voornamen, Achternaam, Geboortedatum, Woonadres, Omschrijving) or
   "Organisatie" (Handelsnaam, KvK-nummer, Rechtsvorm, Adres, Omschrijving), two
   columns. ShKlant: "Gegevens" (three columns, a "Ophalen uit KvK" button),
   then "Afspraken" and "Eigen velden" sections in the same card.
2. "Zaken" and "Tickets" cards (Dq and Pq): rows of title (bold), meta line
   (number · type · handler), status pill, date ("Termijn 1 nov" while open,
   "Klaar 18 nov 2025" when closed), chevron; header link "Alle 2 zaken
   bekijken".
3. "Laatste contactmomenten": a feed of icon (by channel), meta line (date,
   time · channel · direction · case), text; header note "3 in totaal".
4. PqKlant and PqOrganisatie only: "Activiteit" (filter chips, a note composer,
   a mixed feed). ShKlant: "Ook leverancier" (three KPI tiles and a table).

**Side column**, top to bottom (History always last):

| Card | Person (DqContact, PqKlant) | Organisation (DqOrganisatie, PqOrganisatie) | ShKlant |
|---|---|---|---|
| Reach | Bereikbaar via (channel, note, Contact vastleggen) | none | none |
| Identity | Identiteit (DigiD lead, BSN masked with Tonen, Geheimhouding, Bron, logged note) | KvK en adres (KvK lead, address lines, Zaken op de kaart) | SEPA-machtiging |
| Address | Woonadres (lines, Zaken op de kaart) | (in KvK en adres) | none |
| Main contact | none | Hoofdcontact (initials, name, role, mail, Alle 2 contactpersonen) | none |
| Open work | none | Lopende zaken / Open zaken, Open tickets (one featured row each) | Herinneringsschema, Abonnementen |
| Channels | Contactkanalen (Pq: rows with links, Toevoegen) | Contactkanalen (Pq) | none |
| Relations | Relaties (Pq: "Secretaris van <org>", Toevoegen) | Relaties (Pq) | none |
| App extras | Afspraken, Projecten en facturering, Kennisbank (Pq) | Verkoop, contracten en facturering, Kennisbank (Pq) | none |
| History | Historie / Geschiedenis (last change, link) | same | same, plus "Kenmerk KL-00218" |

### Lists

| Part | PqContacten | DqContacten | PqOrganisaties | DqOrganisaties | ShLeveranciers |
|---|---|---|---|---|---|
| Count line | 5 van 186 contacten | 8 van 187 inwoners uit de BRP · ... | 8 van 23 organisaties in Zuiddrecht · gesorteerd op naam | same | 212 leveranciers · 3 contracten lopen binnen 90 dagen af |
| Buttons | Downloaden, Importeren uit Nextcloud Contacten, buildiq, Nieuw contact | Downloaden, Acties, buildiq, Persoon toevoegen | Downloaden, buildiq, Organisatie toevoegen | Downloaden, Acties, buildiq, Organisatie toevoegen | Downloaden, Acties, buildiq, Nieuwe leverancier |
| Lenses | Alle, Met open deals | Alles, Woonplaats Zuiddrecht, Met geheimhouding | Alle, Met open zaak, Verenigingen, Stichtingen, Bedrijven | Alles, Met lopende zaak, Verenigingen, Stichtingen, Bedrijven | Alle, Met raamovereenkomst, Lage score |
| Name cell | link | initials + name + address line | building icon + name | building icon + name | name + category line |
| Columns | E-mail, Telefoon, Rol, Klant | BSN (masked), Woonplaats, Omschrijving | KVK-nummer, Rechtsvorm, Branche, Plaats, Open zaken, Open tickets, Telefoon | KvK-nummer, Rechtsvorm, Plaats, Lopende zaken, Open tickets, Laatste contact | Op tijd, Hoeveelheid, Prijs, Factuurjuistheid, Totaalscore |
| Above the list | none | none | none | none | page tabs (Leveranciers, Contracten, ...), spend by category, contracts ending |

## The canonical shape

The most complete board wins; app-specific parts stay optional config.

### Person detail (canonical: DqContact plus PqKlant's channel and relation cards)

- Header: type pill (constant, `text`), a count pill of the app's main open
  work (`countFrom`), breadcrumb "<list> / <name>", meta line = address. Quick
  actions: "Contact vastleggen" plus the app's "Nieuwe <main object>". Then
  Bewerken, buildiq, Meer.
- Tabs: Overzicht, one tab per related list the app has (Zaken, Tickets,
  Contactmomenten, ...), Bestanden/Documenten, Historie last. Every list tab
  counts (`countFrom: "widget"`).
- Overzicht: data card (two columns), then one `record-list` (`rows`) per open
  work list, then `record-list` (`feed`) of contact moments.
- Side column: Bereikbaar via, Identiteit, Woonadres, Contactkanalen, Relaties
  (each a `facts` or `record-list` card), History last (built in).
- Optional (PqKlant): attention line, contact buttons, KPI row, Activiteit,
  Afspraken, Kennisbank. These are existing widgets placed by the app.

### Organisation detail (canonical: DqOrganisatie plus PqOrganisatie's cards)

Same as the person page with: data card "Organisatie" (Handelsnaam, KvK-nummer,
Rechtsvorm, Adres, Omschrijving); a Contactpersonen tab; side column KvK en
adres, Hoofdcontact, one featured open item per main list (`record-list`
`rows`, `limit: 1`), Contactkanalen, Relaties, History. ShKlant keeps its own
tabs and side cards as optional config of the same frame.

### Lists

Canonical: the DqOrganisaties / DqContacten setup (count line, Downloaden,
Acties, buildiq, primary add button, lenses with counts, search with active
filter line, name cell with icon or initials and a secondary line, row menu).
Columns are app config. Derived count columns wait on the later per-row count
task.

## Example manifest fragment: a person page

Field paths are an example; each app fills its own schema's paths.

```json
{
  "id": "PersonDetail",
  "route": "/persons/:id",
  "type": "detail",
  "title": "Person",
  "config": {
    "register": "my-register",
    "schema": "person",
    "breadcrumb": { "label": "Contacts", "route": "Persons" },
    "typePill": { "text": "Resident", "variant": "info" },
    "statusPill": {
      "countFrom": { "register": "my-register", "schema": "case", "filter": { "requester": "@objectId", "status[ne]": "closed" } },
      "countLabel": { "one": "{count} open case", "other": "{count} open cases" },
      "variant": "purple"
    },
    "headerMeta": "{address.street} {address.number}, {address.city}",
    "headerActions": [
      { "id": "log-contact", "type": "open-form", "label": "Log contact", "icon": "PhoneLogOutline", "register": "my-register", "schema": "contactMoment", "props": { "contact": "@objectId" } },
      { "id": "new-case", "type": "open-form", "label": "New case", "icon": "FolderPlusOutline", "register": "my-register", "schema": "case", "props": { "requester": "@objectId" } }
    ],
    "quickActions": ["log-contact", "new-case"],
    "widgets": [
      { "id": "person-card", "type": "data", "title": "Resident", "content": { "columns": 2, "editable": false, "include": ["displayName", "givenNames", "familyName", "birthDate", "address", "description"] } },
      {
        "id": "person-cases", "type": "record-list", "title": "Cases",
        "content": {
          "register": "my-register", "schema": "case", "filter": { "requester": "@objectId" },
          "sort": { "field": "deadline", "dir": "asc" }, "limit": 5,
          "presentation": "rows",
          "title": "{title}",
          "meta": "{identifier} · {caseTypeName} · handler {assigneeName}",
          "pill": { "field": "status", "colorMap": { "in_behandeling": "purple", "afgehandeld": "success" }, "labels": { "in_behandeling": "In progress", "afgehandeld": "Closed" } },
          "trailing": ["Done {closedAt|date}", "Due {deadline|date}"],
          "rowRoute": "CaseDetail",
          "headerLink": { "label": "View all {total} cases", "route": "Cases", "query": { "requester": "@objectId" } },
          "emptyText": "No cases for this person yet"
        }
      },
      {
        "id": "person-moments", "type": "record-list", "title": "Latest contact moments",
        "content": {
          "register": "my-register", "schema": "contactMoment", "filter": { "contact": "@objectId" },
          "sort": { "field": "startTime", "dir": "desc" }, "limit": 3,
          "presentation": "feed",
          "icon": { "field": "channel", "map": { "phone": "Phone", "email": "EmailOutline", "desk": "AccountOutline" }, "default": "EmailOutline" },
          "meta": "{startTime|datetime} · {channel} · {direction}",
          "text": "{summary}",
          "headerNote": "{total} in total"
        }
      },
      { "id": "person-files", "type": "files", "title": "Files" },
      { "id": "person-history", "type": "audit-trail", "title": "History" },
      {
        "id": "person-panels", "type": "tabs",
        "content": {
          "tabs": [
            { "widgetIds": ["person-card", "person-cases", "person-moments"], "label": "Overview" },
            { "widgetId": "person-cases", "label": "Cases", "countFrom": "widget" },
            { "widgetId": "person-moments", "label": "Contact moments", "countFrom": "widget" },
            { "widgetId": "person-files", "label": "Files" },
            { "widgetId": "person-history" }
          ]
        }
      }
    ],
    "layout": [{ "id": "1", "widgetId": "person-panels", "gridX": 0, "gridY": 0, "gridWidth": 12, "gridHeight": 12, "showTitle": false }],
    "sideColumn": [
      { "id": "side-reach", "type": "facts", "title": "Reachable via", "content": {
        "lead": { "icon": "EmailOutline", "title": "{preferredChannel}" },
        "note": "Last contact on {lastContactAt|date}, via {lastContactChannel}.",
        "action": { "label": "Log contact", "icon": "PhoneLogOutline", "type": "open-form", "register": "my-register", "schema": "contactMoment", "props": { "contact": "@objectId" } }
      } },
      { "id": "side-identity", "type": "facts", "title": "Identity", "content": {
        "rows": [
          { "label": "BSN", "field": "bsn", "format": "masked", "reveal": true },
          { "label": "Confidentiality", "field": "confidential", "format": "boolean" },
          { "label": "Source", "field": "source" }
        ],
        "note": "Showing the BSN is logged."
      } },
      { "id": "side-address", "type": "facts", "title": "Home address", "content": {
        "lines": ["{address.street} {address.number}", "{address.postcode} {address.city}"],
        "link": { "label": "Cases on the map", "icon": "MapMarkerOutline", "route": "CasesMap", "query": { "requester": "@objectId" } }
      } },
      { "id": "side-channels", "type": "facts", "title": "Contact channels", "content": {
        "rows": [
          { "label": "Email", "field": "email", "format": "email", "copy": true },
          { "label": "Phone", "field": "phone", "format": "phone", "copy": true }
        ]
      } },
      { "id": "side-relations", "type": "record-list", "title": "Relations", "content": {
        "register": "my-register", "schema": "relation", "filter": { "from": "@objectId" }, "extend": ["to"],
        "presentation": "inline", "label": "{roleLabel}", "title": "{to.name}", "rowRoute": "OrganisationDetail", "rowIdField": "to.id"
      } },
      "person-history"
    ],
    "sidebar": { "enabled": true }
  }
}
```

## Example manifest fragment: an organisation page

The same page with these differences:

```json
{
  "typePill": { "field": "legalForm", "variant": "teal" },
  "widgets": [
    { "id": "org-card", "type": "data", "title": "Organisation", "content": { "columns": 2, "editable": false, "include": ["tradeName", "kvkNumber", "legalForm", "address", "description"] } },
    { "id": "org-contacts", "type": "record-list", "title": "Contact persons", "content": {
      "register": "my-register", "schema": "contactPerson", "filter": { "organisation": "@objectId" },
      "presentation": "rows", "title": "{name}", "meta": "{role} · {email}", "rowRoute": "PersonDetail" } }
  ],
  "sideColumn": [
    { "id": "side-kvk", "type": "facts", "title": "KvK and address", "content": {
      "lead": { "icon": "OfficeBuildingOutline", "title": "KvK {kvkNumber}", "subtitle": "{legalForm} · Trade register" },
      "lines": ["{address.street} {address.number}", "{address.postcode} {address.city}"],
      "link": { "label": "Cases on the map", "icon": "MapMarkerOutline", "route": "CasesMap", "query": { "requester": "@objectId" } }
    } },
    { "id": "side-main-contact", "type": "facts", "title": "Main contact", "content": {
      "lead": { "initialsFrom": "mainContact.name", "title": "{mainContact.name}", "subtitle": "{mainContact.role}" },
      "rows": [{ "icon": "EmailOutline", "field": "mainContact.email", "format": "email" }],
      "link": { "label": "All contact persons", "route": "Persons", "query": { "organisation": "@objectId" } }
    } },
    { "id": "side-open-case", "type": "record-list", "title": "Open cases", "content": {
      "register": "my-register", "schema": "case", "filter": { "requester": "@objectId", "status[ne]": "closed" }, "limit": 1,
      "presentation": "rows", "title": "{title}", "meta": "{identifier} · handler {assigneeName}",
      "pill": { "field": "status" }, "trailing": ["due {deadline|date}"], "rowRoute": "CaseDetail" } }
  ]
}
```

`mainContact.*` needs `"extend": ["mainContact"]` on the page.

## Decisions

- **One widget for every "objects that point at this record" list.** The
  `record-list` source keys are object-list's (`register`, `schema`, `filter`
  with tokens, `sort`, `limit`, `extend`, `rowRoute`), so a manifest can move a
  list between the table and the board rows by changing `type`. It is a new
  widget rather than an object-list mode because object-list is a table with
  paging, cell budgets, row selection and drop zones, none of which a five-row
  card needs.
- **Templates over field lists.** A row reads "2026-0082 · Woo-verzoek ·
  behandelaar Pieter Jansen": that is a sentence, not three columns. Templates
  use the `{path}` form of `headerMeta`, plus a format after a bar
  (`{deadline|date}`, `|datetime`). A template with an empty token renders
  nothing; a list of templates (`trailing`) takes the first one that fills.
- **A stack is a tab, not a container widget.** The Overview's cards only exist
  on the Overview. Placing them under the tab strip in `layout` would show them
  under every tab.
- **The side column decides the look of a record-list row.** The featured
  "Lopende zaken" card is a `rows` list with `limit: 1`; in the narrow side
  column its row stacks (title, meta, then pill and date) instead of growing a
  separate presentation.
- **Masked values reveal on request.** `format: "masked"` shows the last four
  characters; `reveal: true` adds a Show button. The widget emits
  `reveal` with the field path so the app can log it (the board's "Het tonen van
  het BSN wordt gelogd").
