# board-pager-inert-next-ink Delta

## MODIFIED Requirements

### Requirement: A single page still draws its pager

The inert "Next" of a single-page board pager SHALL be drawn in the main text colour, like the other page links, and
SHALL stay inert (`aria-disabled`, no page change, default cursor).

#### Scenario: Eighteen contacts

- **GIVEN** a board-look list with 18 records on one page
- **THEN** "Volgende" reads in the main text colour and does nothing when clicked
