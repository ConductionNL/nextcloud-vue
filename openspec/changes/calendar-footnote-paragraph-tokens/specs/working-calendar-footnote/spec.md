# working-calendar-footnote Delta: calendar-footnote-paragraph-tokens

## ADDED Requirements

### Requirement: The footnote keeps its size and colour under a theme's paragraph rule

The working calendar's footnote SHALL set `--nldesign-component-paragraph-font-size: 13px`, `--nldesign-component-paragraph-line-height: 1.3` and `--nldesign-component-paragraph-color` to the muted text colour, and its note SHALL set the colour token, so a theme that styles every paragraph through those tokens draws them as the widget does.

#### Scenario: Thematiq on an admin page
- GIVEN thematiq's paragraph rule is active
- WHEN the Werkdagen en feestdagen card renders its footnote
- THEN the footnote reads 13px in the muted colour
