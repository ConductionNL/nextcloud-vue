## ADDED Requirements

### Requirement: the saved-view edit dialog draws the board's form in the board look

In the board look the edit dialog MUST label the name above its field and MUST offer the criteria as two choice cards, "Keep what is saved" and "Replace with the current search term, filters and sort". Each card MUST describe what the view would then hold, as sentences of filters, search term and sort. The Nextcloud look MUST keep its form.

#### Scenario: editing a view on the case list
- GIVEN a saved view "Wacht op inwoner" on status, sorted by deadline ascending, and a list searching "parkeer"
- WHEN its edit dialog opens in the board look
- THEN "Keep what is saved" reads its status filter and "Sorted by deadline, ascending."
- AND "Replace with …" reads the current search term, filters and sort
