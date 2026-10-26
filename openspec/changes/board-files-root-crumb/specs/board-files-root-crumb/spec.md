## ADDED Requirements

### Requirement: the board files bar draws no trail at the root

In the board look CnFilesBrowser MUST NOT draw its trail while the open folder is its root, and MUST draw it in a subfolder.

#### Scenario: DqZaakDocumenten
- GIVEN the case's Files tab at the case folder's root
- THEN the bar holds the buttons only
