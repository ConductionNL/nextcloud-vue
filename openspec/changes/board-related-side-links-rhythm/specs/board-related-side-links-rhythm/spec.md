# board-related-side-links-rhythm Delta

## ADDED Requirements

### Requirement: A related side card's links take the board's rhythm

In the board look, a related-objects card in a detail page's side column SHALL set its link rows at 14px with the normal
leading, 10px apart, and SHALL start the first link 10px under the card title when the card opens on its links.

#### Scenario: A receipt's related records

- **GIVEN** PqKassabon's "Gerelateerd" side card listing its shift, refund and audit lines as links
- **THEN** the first link sits 10px under "Gerelateerd" and the links are 14px, 10px apart, as the board draws them

#### Scenario: The first link starts 10px under the title (PqKassabon, PqContactpersoon r9)

- **GIVEN** a related side card that opens on its link rows
- **THEN** each row is set at the link's 14px and normal leading, so no half-leading of the body's 15px at 1.5 stands above the first link
