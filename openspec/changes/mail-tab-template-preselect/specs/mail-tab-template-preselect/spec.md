## ADDED Requirements

### Requirement: The mail tab can preselect a template

CnMailTab SHALL select the template that `content.templates.preselect` picks when the template list is read: `"first"` the first template, `"only"` the template when the list holds exactly one, `{ field, value }` the first template whose field holds the value. It SHALL keep a template the reader picked while that template is still in the list. Without `preselect` it SHALL select nothing.

#### Scenario: the case E-mail card
- GIVEN the case type has active templates and the tab sets `preselect: "first"`
- THEN the first template is selected and "Concept openen uit sjabloon" is enabled

#### Scenario: a reader's pick survives a reload
- GIVEN the reader picked the second template
- WHEN the templates are read again and still hold it
- THEN the second template stays selected
