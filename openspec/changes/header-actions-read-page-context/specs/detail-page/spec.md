# detail-page Delta

## ADDED Requirements

### Requirement: A header action can gate on the page's context records

A detail page's header action SHALL be able to gate its `visibleWhen` on `@context.<name>.<path>`: the records the page's
conditions name, such as the case type. While those records are not read, the action SHALL stay hidden.

#### Scenario: DqSociaalDomein

- **GIVEN** a Melding Jeugdwet case whose case type has category "Jeugdhulp" and lists `plan-case-meeting` as a quick action
- **THEN** "Overleg plannen" shows in the case header
