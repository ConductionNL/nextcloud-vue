# board-party-rows-as-drawn Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-party-rows-as-drawn](../../)

## ADDED Requirements

### Requirement: Party rows stand at the board's spacing

In the board look the contacts tab SHALL draw a role heading as one line at line height 1.2 without a margin of its own, 14px under the previous group, with no margin under the last group. CnObjectPartiesWidget SHALL draw a party's name and meta line at normal leading, stand its first row 8px under the accepted kinds strip, and draw the rows of consecutive role groups touching, as one ruled list.

#### Scenario: DqZaakBetrokkenen Partijen

- GIVEN the case "Verlichting fietspad Lindelaan" on its Betrokkenen tab in the board look
- THEN the role headings are 18px high, the first one 14px under the buttons, each row 8px under its heading and each heading 14px under the previous row, as the board draws them

#### Scenario: DqZaakBetrokkenen Rollen

- GIVEN the same case
- THEN a party row with a one-line meta is 60px high and one with a two-line meta 75px, the first row stands 8px under the accepted kinds strip and the rows of the next role follow without a gap
