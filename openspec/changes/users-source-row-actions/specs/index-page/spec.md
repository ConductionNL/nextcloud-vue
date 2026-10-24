# index-page Delta: users-source-row-actions

## ADDED Requirements

### Requirement: A member's row menu opens their profile and mails them

The `users` index source SHALL declare row actions "Open profile", a link to `/u/<uid>`, and "Send email", a `mailto:` link shown only for a member with an e-mail address.

#### Scenario: Sanne Bakker
- GIVEN Sanne Bakker with s.bakker@zuiddrecht.nl in the Vergunningen list
- WHEN her row menu opens
- THEN it offers "Profiel openen" and "E-mail verzenden", both links
