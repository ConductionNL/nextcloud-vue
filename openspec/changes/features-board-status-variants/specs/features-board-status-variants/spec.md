# features-board-status-variants Delta

## ADDED Requirements

### Requirement: A roadmap page can name a status's tone

The features board SHALL draw a status in the variant `board.statusVariants` names for it, and in the library's tone
otherwise.

#### Scenario: dossiq's planned features

- **GIVEN** a roadmap page with `board.statusVariants: { planned: "default" }`
- **THEN** a planned feature's pill is neutral and a stable one stays green
