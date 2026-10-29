## ADDED Requirements

### Requirement: A fit table under an index list keeps its heads whole

In the board look, a widget table that fits its card (`fitWidth`) MUST keep the auto table layout when it is drawn inside an index page's table view (`afterList`), so every column but the growing one shows its head and its values on one line at their own width. The index table itself keeps its fixed layout.

#### Scenario: Social performance under the posts list
- GIVEN PqSocial's posts list with the "Sociale prestaties" table after it
- WHEN the page is drawn in the board look
- THEN the heads read Gepubliceerd, Weergaven, Likes, Reacties, Gedeeld, Volgers and Interactiepercentage in full, and Netwerk takes the room left
