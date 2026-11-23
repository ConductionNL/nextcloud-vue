## ADDED Requirements

### Requirement: A dashboard title can follow the page's workspace

The dashboard MUST show the first `titleWhen` title whose workspace condition holds and whose `{workspace.<key>}` tokens all have values. When no entry applies, it MUST show its own title.

#### Scenario: A call names the caller
- GIVEN the werkplek with `titleWhen: [{ when: { workspace: "callActive", value: true }, title: "Gesprek met {workspace.selectedClientName}" }]`
- WHEN a call with Sanne de Vries starts
- THEN the title reads "Gesprek met Sanne de Vries"
