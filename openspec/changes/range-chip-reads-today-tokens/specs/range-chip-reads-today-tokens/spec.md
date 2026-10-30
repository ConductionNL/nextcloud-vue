# range-chip-reads-today-tokens Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [range-chip-reads-today-tokens](../../)

## ADDED Requirements

### Requirement: A range chip writes today tokens as dates

The Active line chip of a range filter SHALL write an end given as `@today` or `@today±Nd` as the date it stands for, in the person's locale, never as the token.

#### Scenario: DqTaken deadline range around today

- GIVEN the tasks index opened with `dueAt=@today-12d..@today+8d` on 30 October 2026
- THEN the chip reads "Deadline: 18 oktober tot en met 7 november", with no "@today" in it
