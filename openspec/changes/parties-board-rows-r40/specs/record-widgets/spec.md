## ADDED Requirements

### Requirement: A board party row reads as design-system #811 draws it

In the board look a party row's meta line SHALL join the primary mark, the role, the link's note, whom the party represents when no note is set, its extra lines, e-mail and documents, by middots, and SHALL NOT name the party's kind. A role that follows the primary mark SHALL read in lower case unless it is an abbreviation. An indicator pill SHALL take the info tone, or the error tone for a blocking verdict, in the words `labels.indicatorPill` gives.

#### Scenario: Sanne on her Woo case
- **GIVEN** Sanne de Vries is the primary party in the role Verzoeker
- **THEN** her meta line starts "Primaire partij · verzoeker"

#### Scenario: a reporter with an indicator
- **GIVEN** Bewonersvereniging Lindelaan carries the warning indicator "Meerdere meldingen" and the app's words are "Indicator: {label}"
- **THEN** its row ends with an info-tone pill "Indicator: Meerdere meldingen"

### Requirement: A party of a listed kind says it has no secrecy

With `content.secrecy` (`indicator`, `kinds`, `primaryOnly`), a party whose kind is listed and whose record carries no indicator keyed `indicator` SHALL show the pill `labels.noSecrecy`. With `primaryOnly` only the primary party SHALL show it. A party that carries the indicator SHALL show that indicator instead.

#### Scenario: the requester and her representative
- **GIVEN** Sanne (primary) and J. van Wijk are persons without the geheimhouding indicator, and `primaryOnly` is set
- **THEN** only Sanne's row reads "Geen geheimhouding"
