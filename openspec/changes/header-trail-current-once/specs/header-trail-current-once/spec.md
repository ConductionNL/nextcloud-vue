## ADDED Requirements

### Requirement: The current page is one crumb

The header trail SHALL draw the page title once as the current crumb, also when the last declared crumb names it.

#### Scenario: Postvak
- GIVEN breadcrumb { label: Mailbox } on the page titled Postvak (nl) with a meta note
- THEN the row reads "Postvak · <meta>"
