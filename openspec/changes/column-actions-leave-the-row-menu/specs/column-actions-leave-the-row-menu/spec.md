## ADDED Requirements

### Requirement: An action shown as a column button is not repeated in the row menu

An index page SHALL leave the row actions named by an `actions` column out of the row menu and the context menu, and
SHALL draw no row menu when no other row action remains.

#### Scenario: Postvak
- GIVEN actions link-case and new-case, both named by the Doen column, and the built-in actions off
- THEN the row menu holds nothing and the table draws no row-menu column

#### Scenario: An action the column does not show
- GIVEN a further action "spam" not named by the column
- THEN the row menu holds "spam" only
