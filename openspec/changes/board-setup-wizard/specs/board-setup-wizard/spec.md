# board-setup-wizard Delta

## ADDED Requirements

### Requirement: The board setup wizard reads as the board draws it

A `config-fields` step SHALL write only the fields the person filled in, and SHALL write nothing when none were filled in.
In the board look the stepper SHALL leave 20px above the step, and a card choice SHALL not repeat the step title the
dialog already shows (its legend stays for assistive tech).

#### Scenario: DqInstellen

- **GIVEN** the setup wizard opened from the admin page with the organisation fields left empty
- **WHEN** the person clicks Next three times
- **THEN** nothing is written and the wizard shows step 4, "Voorbeeldgegevens", with the intro sentence and the cards under the stepper
