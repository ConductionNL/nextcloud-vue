# facts-reveal-button-ink Delta

## ADDED Requirements

### Requirement: The reveal button is labelled in the main text colour

The facts widget's reveal button SHALL draw its label and icon in `--color-main-text`.

#### Scenario: a masked BSN

- **GIVEN** a person's facts card with a masked BSN
- **THEN** the "BSN tonen" button is labelled in the main text colour, not the primary ink
