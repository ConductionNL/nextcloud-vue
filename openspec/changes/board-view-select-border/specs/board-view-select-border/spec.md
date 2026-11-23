## ADDED Requirements

### Requirement: the board view's selects take the board control border

In the board look `.cn-index-page__board-select` MUST draw its border in `--cn-board-control-border`, also under a theme that sets the select border through `--nldesign-component-form-select-border-color`.

#### Scenario: DqWerkbord
- GIVEN the cases board view in the board look under the Zuiddrecht set
- THEN "Zaaktype:" and "Kolommen:" draw a #828a95 border
