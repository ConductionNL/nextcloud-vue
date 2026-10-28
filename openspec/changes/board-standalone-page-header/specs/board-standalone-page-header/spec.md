## ADDED Requirements

### Requirement: A standalone board page header takes the board title

In the board look, a CnPageHeader that no page primitive styles SHALL draw its title at 28px, weight 700, on a 1.2 line. Its description SHALL be 15px on a normal line, set 13px below the title.

#### Scenario: a custom view's header
- GIVEN pipelinq's Forecast view in the board look
- WHEN it renders its CnPageHeader
- THEN "Prognose" reads 28px/700 and the line under it sits 13px below
