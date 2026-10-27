# facts-widget Delta

## ADDED Requirements

### Requirement: A line can join the line before it

A facts `line` or `text` with `joinPrevious: true` SHALL be written on after the line or text just before it, as one
paragraph, separated by `joinSeparator` (a space by default). With no line or text before it, it SHALL stand on its own.

#### Scenario: Sanne has a last contact

- **THEN** "Bereikbaar via" reads one paragraph: "Laatst contact op 14 oktober, via e-mail. Telefoon en e-mail staan niet in de basisregistratie."

#### Scenario: No contact moment yet

- **THEN** the card still reads "Telefoon en e-mail staan niet in de basisregistratie."

### Requirement: A board list's empty sentence is 14px muted

In the board look, a record list's empty sentence on a detail page SHALL be 14px, muted, on the normal line height.

#### Scenario: DqSociaalDomein Andere zaken van dit huishouden

- **THEN** "Geen andere zaken in dit huishouden die u mag zien" starts about 31px under the card title (probed 31.8; it was 33.8)
