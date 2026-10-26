# record-widgets Delta

## ADDED Requirements

### Requirement: The parties widget can show only the primary party

The `parties` widget SHALL offer `presentation: "primary"`, which shows only the primary party of the record: its
initials, its display name and its role label, its correspondence e-mail address as a link, and a foot link that
can name the number of parties and open another tab of the page. Without a primary party it SHALL say so, and a
failed read SHALL say so and never read as "no main contact".

#### Scenario: DqOrganisatie Hoofdcontact

- **GIVEN** an organisation whose primary party is Marja Verbeek in the role `chair`, with one more party
- **WHEN** the widget is configured with `presentation: "primary"`, `roleLabels: { chair: "Voorzitter" }` and
  `link: { label: "Alle {total} contactpersonen", tab: "contact-persons" }`
- **THEN** it shows "MV", "Marja Verbeek", "Voorzitter", her e-mail address as a `mailto:` link, and the link
  "Alle 2 contactpersonen" to `#contact-persons`
- @e2e exclude {library widget, covered by jest; the dossiq page is measured by compdiff}

#### Scenario: no main contact

- **GIVEN** an organisation with one party and no primary party
- **THEN** the widget reads "No main contact yet" and still links to all contact persons
- @e2e exclude {library widget, covered by jest}
