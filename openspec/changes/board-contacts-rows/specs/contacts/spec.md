## ADDED Requirements

### Requirement: The contacts tab draws the board's rows in the board look

In the board look the contacts tab SHALL head each role group with the role name (no count), show no role badge on a
person, put the person's details on one muted line, show the validity period in short dates at the right of the row,
and offer unlinking in a "…" menu. The Nextcloud look SHALL keep its current rows.

#### Scenario: requester on a case
- **GIVEN** Sanne de Vries linked as requester from 3 Oct
- **WHEN** the Partijen card renders in the board look
- **THEN** her row reads her name, her details on one line, "Vanaf 3 okt" at the right, and a "…" menu
