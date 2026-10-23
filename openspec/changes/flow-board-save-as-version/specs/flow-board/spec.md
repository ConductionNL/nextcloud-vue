## ADDED Requirements

### Requirement: A flow page can save edits as the next version

A flow page with `saveAsVersion` MUST let the author edit a published flow in place, and Save MUST publish the edits as
the flow's next version, leaving runs already started on their version. Without it a published flow MUST stay
read-only.

#### Scenario: Editing a published case type flow
- GIVEN a published flow at version 4 on a page with `saveAsVersion`
- WHEN the author adds a step and presses Save
- THEN the flow is drafted, the edited graph is written onto the draft and the draft is published as version 5

#### Scenario: An ordinary flow page
- GIVEN a published flow on a page without `saveAsVersion`
- THEN the canvas is read-only and offers to create a draft version

#### Scenario: The path meta
- GIVEN `metaParts: ["version"]` and `metaNote: "changes apply to new cases"`
- THEN the path reads "version 4 · changes apply to new cases" after the flow's name
