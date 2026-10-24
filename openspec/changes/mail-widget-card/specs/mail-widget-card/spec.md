## ADDED Requirements

### Requirement: the mail widget stands in a card on a card surface

The `mail` widget type MUST be registered as owning its title and asking for the card, so that on a card surface outside a body grid cell it renders inside an untitled card, and bare in a grid cell or in bare chrome.

#### Scenario: DqZaakEmail
- GIVEN the case's E-mail tab stack with the mail widget first
- THEN the mail widget stands in a white card that joins the open tab
