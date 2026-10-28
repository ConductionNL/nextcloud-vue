## ADDED Requirements

### Requirement: Every linked mail carries a "more actions" menu

CnEmailTab SHALL put a menu labelled "More actions for this mail" beside each linked mail, outside the row's link, offering Open in Mail when the mail has Mail ids and Unlink mail, which removes the link and reloads the list.

#### Scenario: unlinking a mail
- GIVEN a case with a linked mail
- WHEN the handler chooses Unlink mail in that mail's menu
- THEN the link is deleted and the list no longer shows the mail

### Requirement: The board look draws linked mail as the board's rows

In the board look, a linked mail SHALL be a row under a hairline with 12px above and below, a 32px initials tile on the grey chip in the soft ink at 12px bold, the subject at 15px/600 in the main ink without the theme's link colour or underline, the sender 2px under it at 13px muted, and a 34px bordered menu button.

#### Scenario: the case E-mail card
- GIVEN DqZaakEmail's linked mails
- THEN each row matches the board's tile, text and menu button
