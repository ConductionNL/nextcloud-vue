# record-widgets Delta

## ADDED Requirements

### Requirement: The parties widget can add and remove parties

The `parties` widget SHALL offer, when its content declares `manage`, adding a party (somebody known, or somebody new
described by the declared fields with no identifier required) in a role the record accepts, optionally as the
primary party, and removing a party from a role after a confirm. Every write SHALL go through OpenRegister's party
API, so the record's update right decides; a refusal SHALL be shown and nothing SHALL change. The buttons SHALL be
hidden when OpenRegister says the reader may not update the record's schema.

#### Scenario: Add a secretary who has no BSN

- **GIVEN** an organisation the reader may update, with `manage.add.create` declaring first name, last name and e-mail
- **WHEN** the reader describes Kees de Wit with an e-mail address, chooses Secretaris and confirms
- **THEN** a person is saved with his name, his e-mail as a correspondence address and his display name, and linked
  as `secretary`, and the list shows him
- @e2e exclude {library widget, covered by jest; the dossiq page is measured live}

#### Scenario: A reader without the update right

- **GIVEN** an organisation the reader may read but not update
- **THEN** the widget shows no add or remove buttons, and a write that is still refused shows "You may not change who
  is on this record."
- @e2e exclude {library widget, covered by jest; the server check is openregister PartyControllerTest}

#### Scenario: Remove the main contact

- **WHEN** the reader removes Marja Verbeek and confirms "Remove Marja Verbeek as Voorzitter?"
- **THEN** her link in that role is deleted and the page's tab count and main contact card read again
- @e2e exclude {library widget, covered by jest}
