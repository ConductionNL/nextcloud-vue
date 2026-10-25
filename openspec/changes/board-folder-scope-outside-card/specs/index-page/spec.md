# index-page Delta: board-folder-scope-outside-card

## ADDED Requirements

### Requirement: The selected folder heads the list from outside its card

In the board look, a CnIndexPage whose list is headed by the selected folder (scope heading) SHALL frame its table and footer as the card, with the heading above it. The Active line SHALL NOT draw a chip for the folder pane's `filterField`.

#### Scenario: Vergunningen
- GIVEN DqAfdelingen with Vergunningen picked in the folder pane
- THEN "Vergunningen" and "Fysiek domein · 3 medewerkers" stand above the bordered table, and the Active line shows no "group: …" chip
