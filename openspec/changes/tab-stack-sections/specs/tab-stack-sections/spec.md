# tab-stack-sections

## ADDED Requirements

### Requirement: A stack of sections is one sheet in the board look

A stack tab with `sections: true` MUST draw its widgets as sections of the tab panel in the board look: the panel is framed as one card and the widgets draw no card of their own. A section that follows a titled section MUST have a hairline above it. Without `sections` a stack MUST keep its cards.

#### Scenario: a lead's overview

- GIVEN a lead page whose Overview tab stacks the stage strip, the deal, its products, its contacts and its flow runs with `sections: true`
- WHEN the page renders in the board look
- THEN the tab panel is one framed card
- AND a hairline runs above Products, Contacts and Flow runs, not above Deal

### Requirement: A stacked widget can go without its title

A widget in a stack whose definition says `showTitle: false` MUST draw no title.

#### Scenario: the stage strip

- GIVEN a stack whose first widget is a stage strip with `showTitle: false`
- WHEN the tab opens
- THEN the strip draws without the "Stages" title
